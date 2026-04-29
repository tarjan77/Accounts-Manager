"use client";

import jsPDF from "jspdf";
import { formatCurrency, formatDate } from "@/lib/format";
import { lineItemTotal } from "@/lib/job-items";
import { loadInvoiceLogo } from "@/lib/logo";
import type { InvoiceLineItem } from "@/lib/types";

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

type DocumentPdfInput = {
  type: "Quote" | "Invoice";
  number: string;
  date: string;
  dueDate?: string;
  expiryDate?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  lineItems: InvoiceLineItem[];
  notes?: string;
  terms?: string;
  paymentOptions?: string[];
  status?: string;
};

function imageFormat(dataUrl: string) {
  if (dataUrl.includes("image/jpeg") || dataUrl.includes("image/jpg")) {
    return "JPEG";
  }

  if (dataUrl.includes("image/webp")) {
    return "WEBP";
  }

  return "PNG";
}

function drawLines(
  doc: jsPDF,
  lines: string[],
  x: number,
  y: number,
  options?: { align?: "left" | "right"; lineHeight?: number }
) {
  const lineHeight = options?.lineHeight ?? 4.8;
  lines.forEach((line, index) => {
    doc.text(line, x, y + index * lineHeight, { align: options?.align || "left" });
  });
}

function splitDescription(description: string) {
  const lines = description
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.length ? lines : ["Cleaning service"];
}

export async function generateDocumentPdf(input: DocumentPdfInput) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  const tableWidth = pageWidth - margin * 2;
  const logoDataUrl = await loadInvoiceLogo();

  doc.setFillColor(244, 248, 246);
  doc.rect(0, 0, pageWidth, 46, "F");

  if (logoDataUrl) {
    try {
      const image = doc.getImageProperties(logoDataUrl);
      const maxWidth = 54;
      const maxHeight = 34;
      const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
      doc.addImage(
        logoDataUrl,
        imageFormat(logoDataUrl),
        margin,
        8,
        image.width * scale,
        image.height * scale
      );
    } catch {
      // Logo loading should never block document generation.
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(23, 32, 28);
  drawLines(doc, businessLines, pageWidth - margin, 10, {
    align: "right",
    lineHeight: 3.8
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(33, 125, 95);
  doc.text(input.type, margin, 68);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(102, 115, 109);
  doc.text(`${input.type} Number: ${input.number}`, margin, 78);
  doc.text(`${input.type} Date: ${formatDate(input.date)}`, margin, 84);

  if (input.type === "Invoice" && input.dueDate) {
    doc.text(`Due Date: ${formatDate(input.dueDate)}`, margin, 90);
  }

  if (input.type === "Quote" && input.expiryDate) {
    doc.text(`Expiry Date: ${formatDate(input.expiryDate)}`, margin, 90);
  }

  if (input.status) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(33, 125, 95);
    doc.text(input.status, pageWidth - margin, 68, { align: "right" });
  }

  doc.setDrawColor(221, 230, 225);
  doc.line(margin, 98, pageWidth - margin, 98);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(23, 32, 28);
  doc.text("Bill To", margin, 110);
  doc.setFontSize(10);
  doc.text(input.customerName || "Customer", margin, 119);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(61, 72, 67);
  const customerLines = [
    input.customerPhone ? `Phone: ${input.customerPhone}` : "",
    input.customerEmail ? `Email: ${input.customerEmail}` : "",
    input.customerAddress || ""
  ].filter(Boolean);
  drawLines(doc, customerLines, margin, 125, { lineHeight: 4.8 });

  const tableTop = 140;
  doc.setFillColor(33, 125, 95);
  doc.rect(margin, tableTop, tableWidth, 11, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text("#", margin + 5, tableTop + 7);
  doc.text("Item and Description", margin + 16, tableTop + 7);
  doc.text("Qty", pageWidth - 73, tableTop + 7, { align: "right" });
  doc.text("Rate", pageWidth - 48, tableTop + 7, { align: "right" });
  doc.text("Amount", pageWidth - margin - 5, tableTop + 7, { align: "right" });

  let rowY = tableTop + 11;
  doc.setFontSize(9);
  input.lineItems.forEach((item, index) => {
    const descriptionLines = splitDescription(item.description).flatMap((line) =>
      doc.splitTextToSize(line, 94) as string[]
    );
    const rowHeight = Math.max(13, descriptionLines.length * 4.6 + 7);

    doc.setDrawColor(221, 230, 225);
    doc.line(margin, rowY, pageWidth - margin, rowY);
    doc.setTextColor(23, 32, 28);
    doc.setFont("helvetica", "normal");
    doc.text(String(index + 1), margin + 5, rowY + 8);

    descriptionLines.forEach((line, lineIndex) => {
      doc.setFont("helvetica", lineIndex === 0 ? "bold" : "normal");
      doc.setTextColor(lineIndex === 0 ? 23 : 102, lineIndex === 0 ? 32 : 115, lineIndex === 0 ? 28 : 109);
      doc.text(line, margin + 16, rowY + 8 + lineIndex * 4.6);
    });

    doc.setFont("helvetica", "normal");
    doc.setTextColor(23, 32, 28);
    doc.text(String(item.quantity), pageWidth - 73, rowY + 8, { align: "right" });
    doc.text(formatCurrency(item.unitPrice), pageWidth - 48, rowY + 8, {
      align: "right"
    });
    doc.text(formatCurrency(lineItemTotal(item)), pageWidth - margin - 5, rowY + 8, {
      align: "right"
    });
    rowY += rowHeight;
  });

  doc.line(margin, rowY, pageWidth - margin, rowY);
  const total = input.lineItems.reduce((sum, item) => sum + lineItemTotal(item), 0);
  const totalTop = rowY + 12;
  doc.setFillColor(244, 248, 246);
  doc.rect(pageWidth - 82, totalTop, 64, 24, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(102, 115, 109);
  doc.text("Total Amount", pageWidth - 76, totalTop + 9);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(23, 32, 28);
  doc.text(formatCurrency(total), pageWidth - margin - 5, totalTop + 18, {
    align: "right"
  });

  let footerY = Math.max(totalTop + 38, 218);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Notes", margin, footerY);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(61, 72, 67);
  const notes = doc.splitTextToSize(input.notes || "Thank you for choosing Shree Cleaning.", 170) as string[];
  drawLines(doc, notes, margin, footerY + 7, { lineHeight: 4.5 });

  footerY += 18 + notes.length * 4.5;

  if (input.paymentOptions?.length) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(23, 32, 28);
    doc.text("Payment Options", margin, footerY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(61, 72, 67);
    doc.text(input.paymentOptions.join(", "), margin, footerY + 7);
    footerY += 18;
  }

  if (input.terms) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(23, 32, 28);
    doc.text("Terms and Conditions", margin, footerY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(61, 72, 67);
    const terms = input.terms
      .split("\n")
      .flatMap((line) => doc.splitTextToSize(`- ${line.trim()}`, 170) as string[]);
    drawLines(doc, terms, margin, footerY + 7, { lineHeight: 4.5 });
  }

  doc.save(`${input.type.toLowerCase()}-${input.number}.pdf`);
}
