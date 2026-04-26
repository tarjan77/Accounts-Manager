"use client";

import jsPDF from "jspdf";
import { formatCurrency, formatDate, todayISO } from "@/lib/format";
import type { Customer, Job } from "@/lib/types";

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
      const maxWidth = 42;
      const maxHeight = 24;
      const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      doc.addImage(logoDataUrl, imageFormat(logoDataUrl), margin, 14, width, height);
    } catch {
      // A failed logo must never block invoice generation.
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(23, 32, 28);
  drawTextBlock(doc, businessLines, pageWidth - margin, 14, {
    align: "right",
    lineHeight: 4.2
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
  doc.text(`Due Date: ${formatDate(invoiceDate)}`, margin, 90);

  const customerLines = [
    customer?.name || job.customerName || "Customer",
    customer?.phone ? `Phone: ${customer.phone}` : "",
    customer?.email ? `Email: ${customer.email}` : "",
    customer?.address || ""
  ].filter(Boolean);

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(221, 230, 225);
  doc.roundedRect(margin, 104, pageWidth - margin * 2, 34, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(23, 32, 28);
  doc.text("Bill To", margin + 6, 114);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(61, 72, 67);
  drawTextBlock(doc, customerLines, margin + 6, 122, { lineHeight: 4.8 });

  const tableTop = 154;
  doc.setFillColor(33, 125, 95);
  doc.roundedRect(margin, tableTop, pageWidth - margin * 2, 11, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("Service", margin + 6, tableTop + 7);
  doc.text("Amount", pageWidth - margin - 6, tableTop + 7, { align: "right" });

  doc.setDrawColor(221, 230, 225);
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, tableTop + 11, pageWidth - margin * 2, 30, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(23, 32, 28);
  const description = doc.splitTextToSize(job.serviceDescription, 120) as string[];
  doc.text(description, margin + 6, tableTop + 22);
  doc.text(formatCurrency(job.price), pageWidth - margin - 6, tableTop + 22, {
    align: "right"
  });

  const totalTop = tableTop + 52;
  doc.setFillColor(244, 248, 246);
  doc.roundedRect(pageWidth - 82, totalTop, 64, 24, 2, 2, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(102, 115, 109);
  doc.text("Total Amount", pageWidth - 76, totalTop + 9);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(23, 32, 28);
  doc.text(formatCurrency(job.price), pageWidth - margin - 6, totalTop + 18, {
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
