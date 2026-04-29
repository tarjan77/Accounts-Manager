import { lineItemTotal } from "@/lib/job-items";
import type { InvoiceLineItem } from "@/lib/types";

export const defaultQuoteNotes =
  "Thank you for requesting a quote. Please review the details and feel free to contact us if you have any questions or would like to proceed.";

export const defaultInvoiceNotes =
  "Bank transfer preferred to avoid payment processing fee.";

export const defaultTerms =
  "Quotes are based on the information provided and the visible condition of the property.\nFinal pricing may vary if the size, condition, or scope of work differs on arrival.\nPayment is due upon completion of the job, unless prior arrangements are made.\nCard, Stripe and PayPal payments may incur processing fees.";

export function documentTotal(items: InvoiceLineItem[]) {
  return items.reduce((total, item) => total + lineItemTotal(item), 0);
}

export function nextDocumentNumber(prefix: string, existingCount: number) {
  return `${prefix}-${String(existingCount + 1).padStart(6, "0")}`;
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
