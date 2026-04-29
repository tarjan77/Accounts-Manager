import {
  addDoc,
  collection,
  deleteField,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc
} from "firebase/firestore";
import { lineItemsTotal, normalizeLineItems, summarizeLineItems } from "@/lib/job-items";
import { requireDb } from "@/lib/firebase";
import { normalizeCustomerInput } from "@/lib/address";
import type {
  BusinessInvoiceInput,
  CatalogItemInput,
  CustomerInput,
  InvoiceLineItem,
  JobInput,
  PaymentMethod,
  QuoteInput,
  QuoteStatus,
  ReceivedPaymentInput
} from "@/lib/types";

export function customersPath(userId: string) {
  return collection(requireDb(), "users", userId, "customers");
}

export function jobsPath(userId: string) {
  return collection(requireDb(), "users", userId, "jobs");
}

export function itemsPath(userId: string) {
  return collection(requireDb(), "users", userId, "items");
}

export function invoicesPath(userId: string) {
  return collection(requireDb(), "users", userId, "invoices");
}

export function paymentsPath(userId: string) {
  return collection(requireDb(), "users", userId, "payments");
}

export function publicQuotesPath() {
  return collection(requireDb(), "publicQuotes");
}

export function businessSettingsDoc(userId: string) {
  return doc(requireDb(), "users", userId, "settings", "business");
}

function sanitizeLineItems(items: InvoiceLineItem[]) {
  return items
    .filter((item) => item.description.trim())
    .map((item, index) => ({
      id: item.id || `item-${index + 1}`,
      description: item.description.trim(),
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.unitPrice) || 0
    }));
}

export async function createCustomer(userId: string, input: CustomerInput) {
  const normalized = normalizeCustomerInput(input);
  const ref = await addDoc(customersPath(userId), {
    ...normalized,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return ref.id;
}

export async function updateCustomer(
  userId: string,
  customerId: string,
  input: CustomerInput
) {
  const normalized = normalizeCustomerInput(input);
  await updateDoc(doc(requireDb(), "users", userId, "customers", customerId), {
    ...normalized,
    updatedAt: serverTimestamp()
  });
}

export async function deleteCustomer(userId: string, customerId: string) {
  await deleteDoc(doc(requireDb(), "users", userId, "customers", customerId));
}

export async function createJob(userId: string, input: JobInput) {
  const lineItems = normalizeLineItems(input);
  const ref = await addDoc(jobsPath(userId), {
    ...input,
    lineItems,
    serviceDescription: input.serviceDescription || summarizeLineItems(lineItems),
    price: lineItemsTotal(lineItems),
    time: input.time || "",
    notes: input.notes || "",
    jobStatus: input.jobStatus || "Scheduled",
    paymentMethod: input.paymentMethod || "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return ref.id;
}

export async function updateJob(userId: string, jobId: string, input: JobInput) {
  const lineItems = normalizeLineItems(input);
  await updateDoc(doc(requireDb(), "users", userId, "jobs", jobId), {
    ...input,
    lineItems,
    serviceDescription: input.serviceDescription || summarizeLineItems(lineItems),
    price: lineItemsTotal(lineItems),
    time: input.time || "",
    notes: input.notes || "",
    jobStatus: input.jobStatus || "Scheduled",
    paymentMethod: input.paymentMethod || "",
    updatedAt: serverTimestamp()
  });
}

export async function deleteJob(userId: string, jobId: string) {
  await deleteDoc(doc(requireDb(), "users", userId, "jobs", jobId));
}

export async function markPaymentReceived(
  userId: string,
  jobId: string,
  paymentMethod: PaymentMethod = "Bank Transfer"
) {
  await updateDoc(doc(requireDb(), "users", userId, "jobs", jobId), {
    paymentStatus: "Paid",
    jobStatus: "Completed",
    paymentMethod: paymentMethod || "Bank Transfer",
    paidAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function markJobCompleted(userId: string, jobId: string) {
  await updateDoc(doc(requireDb(), "users", userId, "jobs", jobId), {
    jobStatus: "Completed",
    completedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function createItem(userId: string, input: CatalogItemInput) {
  const ref = await addDoc(itemsPath(userId), {
    ...input,
    rate: Number(input.rate) || 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return ref.id;
}

export async function updateItem(
  userId: string,
  itemId: string,
  input: CatalogItemInput
) {
  await updateDoc(doc(requireDb(), "users", userId, "items", itemId), {
    ...input,
    rate: Number(input.rate) || 0,
    updatedAt: serverTimestamp()
  });
}

export async function deleteItem(userId: string, itemId: string) {
  await deleteDoc(doc(requireDb(), "users", userId, "items", itemId));
}

export async function createQuote(userId: string, input: QuoteInput) {
  const lineItems = sanitizeLineItems(input.lineItems);
  const total = lineItemsTotal(lineItems);

  await setDoc(doc(requireDb(), "publicQuotes", input.publicToken), {
    ...input,
    ownerId: userId,
    lineItems,
    total,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return input.publicToken;
}

export async function updateQuote(userId: string, quoteId: string, input: QuoteInput) {
  const lineItems = sanitizeLineItems(input.lineItems);
  await updateDoc(doc(requireDb(), "publicQuotes", quoteId), {
    ...input,
    ownerId: userId,
    lineItems,
    total: lineItemsTotal(lineItems),
    updatedAt: serverTimestamp()
  });
}

export async function updatePublicQuoteStatus(
  quoteId: string,
  status: Extract<QuoteStatus, "Accepted" | "Declined">
) {
  await updateDoc(doc(requireDb(), "publicQuotes", quoteId), {
    status,
    respondedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function createInvoice(userId: string, input: BusinessInvoiceInput) {
  const lineItems = sanitizeLineItems(input.lineItems);
  const total = lineItemsTotal(lineItems);
  const ref = await addDoc(invoicesPath(userId), {
    ...input,
    lineItems,
    total,
    balanceDue: input.status === "Paid" ? 0 : total,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return ref.id;
}

export async function updateInvoice(
  userId: string,
  invoiceId: string,
  input: BusinessInvoiceInput
) {
  const lineItems = sanitizeLineItems(input.lineItems);
  const total = lineItemsTotal(lineItems);
  await updateDoc(doc(requireDb(), "users", userId, "invoices", invoiceId), {
    ...input,
    lineItems,
    total,
    balanceDue: input.status === "Paid" ? 0 : total,
    updatedAt: serverTimestamp()
  });
}

export async function createPayment(userId: string, input: ReceivedPaymentInput) {
  const ref = await addDoc(paymentsPath(userId), {
    ...input,
    amount: Number(input.amount) || 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return ref.id;
}

export async function updateBusinessLogo(userId: string, logoDataUrl: string) {
  await setDoc(
    businessSettingsDoc(userId),
    {
      logoDataUrl,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}

export async function removeBusinessLogo(userId: string) {
  await setDoc(
    businessSettingsDoc(userId),
    {
      logoDataUrl: deleteField(),
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}
