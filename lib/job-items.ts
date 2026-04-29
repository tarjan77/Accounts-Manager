import type { InvoiceLineItem, Job } from "@/lib/types";

export function lineItemTotal(item: InvoiceLineItem) {
  return (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
}

export function lineItemsTotal(items: InvoiceLineItem[]) {
  return items.reduce((total, item) => total + lineItemTotal(item), 0);
}

export function normalizeLineItems(job: Pick<Job, "lineItems" | "serviceDescription" | "price">) {
  if (Array.isArray(job.lineItems) && job.lineItems.length) {
    return job.lineItems.map((item, index) => ({
      id: item.id || `item-${index + 1}`,
      description: item.description || job.serviceDescription || "Cleaning service",
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.unitPrice) || 0
    }));
  }

  return [
    {
      id: "legacy-service",
      description: job.serviceDescription || "Cleaning service",
      quantity: 1,
      unitPrice: Number(job.price) || 0
    }
  ];
}

export function summarizeLineItems(items: InvoiceLineItem[]) {
  if (!items.length) {
    return "";
  }

  if (items.length === 1) {
    return items[0].description;
  }

  return `${items[0].description} + ${items.length - 1} more`;
}
