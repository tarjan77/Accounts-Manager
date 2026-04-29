import { lineItemTotal } from "@/lib/job-items";
import type { InvoiceLineItem } from "@/lib/types";

export const defaultQuoteNotes =
  "Thank you for requesting a quote. Please review the details and feel free to contact us if you have any questions or would like to proceed.";

export const defaultInvoiceNotes =
  "Bank transfer preferred to avoid payment processing fee.";

export const defaultQuoteTerms =
  "Quote is based on information provided by the customer about the property and its visible condition before arrival.\nFinal pricing may vary if the size, condition, or scope of work differs on arrival.\nPayment is due upon completion of the job, unless prior arrangements are made.\nCard, Stripe and PayPal payments may incur processing fees.";

export const defaultInvoiceTerms =
  "Payment is due by the invoice due date unless prior arrangements are made.\nBank transfer is preferred to avoid payment processing fees.\nCard, Stripe and PayPal payments may incur processing fees.\nPlease include the invoice number as the payment reference.";

export function documentTotal(items: InvoiceLineItem[]) {
  return items.reduce((total, item) => total + lineItemTotal(item), 0);
}

export function nextDocumentNumber(
  prefix: string,
  existing: number | Array<string | { quoteNumber?: string; invoiceNumber?: string; paymentNumber?: string }>
) {
  if (typeof existing === "number") {
    return `${prefix}-${String(existing + 1).padStart(6, "0")}`;
  }

  const maxNumber = existing.reduce((max, value) => {
    const raw =
      typeof value === "string"
        ? value
        : value.quoteNumber || value.invoiceNumber || value.paymentNumber || "";
    const match = raw.match(/(\d+)(?!.*\d)/);
    const parsed = match ? Number(match[1]) : 0;
    return Math.max(max, parsed);
  }, 0);

  return `${prefix}-${String(maxNumber + 1).padStart(6, "0")}`;
}

export function blankLineItem(): InvoiceLineItem {
  return {
    id: `item-${Date.now()}`,
    description: "",
    quantity: 1,
    unitPrice: 0
  };
}

export function cleanEmail(value: string) {
  return value.trim().toLowerCase();
}
