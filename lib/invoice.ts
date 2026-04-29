"use client";

import jsPDF from "jspdf";
import { formatAddressLines } from "@/lib/address";
import { formatCurrency, formatDate, todayISO } from "@/lib/format";
import { lineItemTotal, normalizeLineItems } from "@/lib/job-items";
import type { Customer, InvoiceLineItem, Job } from "@/lib/types";

const businessLines = [
  "Shree Cleaning",
  "48A Forrest Avenue",
  "South Bunbury WA 6230",
  "Australia",
  "ABN 34984880361",
  "0452135542",
  "info@shreecleaning.com",
  "https://www.shreecleaning.com/"
];

function invoiceNumber(job: Job) {
  const compactDate = todayISO().replace(/-/g, "");
  return `SC-${compactDate}-${job.id.slice(0, 6).toUpperCase()}`;
}

function imageFormat(dataUrl: string) {
  if (dataUrl.includes("image/jpeg") || dataUrl.includes("image/jpg")) {
    return "JPEG";
  }

  if (dataUrl.includes("image/webp")) {
    return "WEBP";
  }

  return "PNG";
}

function drawTextBlock(
  doc: jsPDF,
  lines: string[],
  x: number,
  y: number,
  options?: { align?: "left" | "right"; lineHeight?: number }
) {
  const lineHeight = options?.lineHeight ?? 5;
  lines.forEach((line, index) => {
    doc.text(line, x, y + index * lineHeight, { align: options?.align || "left" });
  });
}

function countLabel(count: number | undefined, singular: string) {
  if (count === undefined || count === null) {
    return "";
  }

  const value = Number(count) || 0;
  return `${value} ${singular}${value === 1 ? "" : "s"}`;
}

function stripServicePrefix(description: string, serviceType: string) {
  const trimmed = description.trim();
  const prefix = `${serviceType} - `;

  return trimmed.startsWith(prefix) ? trimmed.slice(prefix.length).trim() : trimmed;
}

function invoiceServiceLines(job: Job, item: InvoiceLineItem, index: number) {
  const description = item.description.trim();
  const isPrimaryService = item.id === "base-service" || index === 0;

  if (!isPrimaryService || !job.serviceType || job.serviceType === "Custom") {
    return [description || "Cleaning service"];
  }

  if (job.serviceType === "Window Cleaning") {
    return [
      "Window Cleaning",
      stripServicePrefix(description, "Window Cleaning") || "Window package"
    ];
  }

  if (job.serviceType === "End of Lease / Vacate" || job.serviceType === "Deep Cleaning") {
    const propertyDetails = [
      job.propertyType || "",
      countLabel(job.bedrooms, "bedroom"),
      countLabel(job.bathrooms, "bathroom")
    ]
      .filter(Boolean)
      .join(", ");

    return [
      job.serviceType,
      propertyDetails || stripServicePrefix(description, job.serviceType)
    ].filter(Boolean);
  }

  if (job.serviceType === "Pressure Cleaning") {
    return [
      "Pressure Cleaning",
      stripServicePrefix(description, "Pressure Cleaning") || "Site visit required"
    ];
  }

  return [description || job.serviceType];
}

export async function generateInvoicePdf({
  job,
  customer,
  logoDataUrl
}: {
  job: Job;
  customer?: Customer;
  logoDataUrl?: string;
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const invoiceNo = invoiceNumber(job);
  const invoiceDate = todayISO();
  const margin = 18;

  doc.setFillColor(244, 248, 246);
  doc.rect(0, 0, pageWidth, 46, "F");

  if (logoDataUrl) {
    try {
      const image = doc.getImageProperties(logoDataUrl);
      const maxWidth = 54;
      const maxHeight = 34;
      const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      doc.addImage(logoDataUrl, imageFormat(logoDataUrl), margin, 9, width, height);
    } catch {
      // A failed logo must never block invoice generation.
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(23, 32, 28);
  drawTextBlock(doc, businessLines, pageWidth - margin, 11, {
    align: "right",
    lineHeight: 3.8
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(33, 125, 95);
  doc.text("Invoice", margin, 68);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(102, 115, 109);
  doc.text(`Invoice Number: ${invoiceNo}`, margin, 78);
  doc.text(`Invoice Date: ${formatDate(invoiceDate)}`, margin, 84);

  doc.setDrawColor(221, 230, 225);
  doc.line(margin, 94, pageWidth - margin, 94);

  const customerName = customer?.name || job.customerName || "Customer";
  const customerLines = [
    customer?.phone ? `Phone: ${customer.phone}` : "",
    customer?.email ? `Email: ${customer.email}` : "",
    ...formatAddressLines(customer)
  ].filter(Boolean);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(23, 32, 28);
  doc.text("Bill To", margin, 106);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(customerName, margin, 115);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(61, 72, 67);
  drawTextBlock(doc, customerLines, margin, 122, { lineHeight: 4.8 });

  const items = normalizeLineItems(job);
  const billToBottom = 122 + Math.max(customerLines.length - 1, 0) * 4.8 + 9;
  doc.setDrawColor(221, 230, 225);
  doc.line(margin, billToBottom, pageWidth - margin, billToBottom);

  const tableTop = Math.max(146, billToBottom + 12);
  const tableWidth = pageWidth - margin * 2;
  const tableRows = items.map((item, index) => {
    const serviceLines = invoiceServiceLines(job, item, index).flatMap((line) =>
      doc.splitTextToSize(line, 98) as string[]
    );

    return {
      item,
      serviceLines,
      height: Math.max(11.5, serviceLines.length * 4.8 + 6.5)
    };
  });
  const tableHeight = tableRows.reduce((total, row) => total + row.height, 0);
  const itemsTotal = items.reduce((total, item) => total + lineItemTotal(item), 0);

  doc.setFillColor(33, 125, 95);
  doc.rect(margin, tableTop, tableWidth, 11, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("#", margin + 6, tableTop + 7);
  doc.text("Service", margin + 18, tableTop + 7);
  doc.text("Qty", pageWidth - 73, tableTop + 7, { align: "right" });
  doc.text("Rate", pageWidth - 48, tableTop + 7, { align: "right" });
  doc.text("Amount", pageWidth - margin - 6, tableTop + 7, { align: "right" });

  doc.setDrawColor(221, 230, 225);
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, tableTop + 11, tableWidth, tableHeight, "FD");

  doc.setFontSize(9.5);
  let rowY = tableTop + 11;
  tableRows.forEach(({ item, serviceLines, height }, index) => {
    const textY = rowY + 8;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(23, 32, 28);
    doc.text(String(index + 1), margin + 6, textY);

    serviceLines.forEach((line, lineIndex) => {
      const isMainLine = lineIndex === 0;
      doc.setFont("helvetica", isMainLine ? "bold" : "normal");
      doc.setTextColor(isMainLine ? 23 : 102, isMainLine ? 32 : 115, isMainLine ? 28 : 109);
      doc.text(line, margin + 18, textY + lineIndex * 4.8);
    });

    doc.setFont("helvetica", "normal");
    doc.setTextColor(23, 32, 28);
    doc.text(String(item.quantity), pageWidth - 73, textY, { align: "right" });
    doc.text(formatCurrency(item.unitPrice), pageWidth - 48, textY, { align: "right" });
    doc.text(formatCurrency(lineItemTotal(item)), pageWidth - margin - 6, textY, {
      align: "right"
    });

    rowY += height;
    if (index < tableRows.length - 1) {
      doc.setDrawColor(235, 240, 237);
      doc.line(margin, rowY, pageWidth - margin, rowY);
    }
  });

  const totalTop = tableTop + tableHeight + 26;
  doc.setFillColor(244, 248, 246);
  doc.roundedRect(pageWidth - 82, totalTop, 64, 24, 2, 2, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(102, 115, 109);
  doc.text("Total Amount", pageWidth - 76, totalTop + 9);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(23, 32, 28);
  doc.text(formatCurrency(itemsTotal), pageWidth - margin - 6, totalTop + 18, {
    align: "right"
  });

  doc.setDrawColor(221, 230, 225);
  doc.line(margin, 268, pageWidth - margin, 268);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(102, 115, 109);
  doc.text("Thank you for choosing Shree Cleaning.", margin, 276);

  doc.save(`invoice-${invoiceNo}.pdf`);
}
