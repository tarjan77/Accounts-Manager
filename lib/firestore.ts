import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
import { lineItemsTotal, normalizeLineItems, summarizeLineItems } from "@/lib/job-items";
import { requireDb } from "@/lib/firebase";
import { normalizeCustomerInput } from "@/lib/address";
import type { CustomerInput, JobInput, PaymentMethod } from "@/lib/types";

export function customersPath(userId: string) {
  return collection(requireDb(), "users", userId, "customers");
}

export function jobsPath(userId: string) {
  return collection(requireDb(), "users", userId, "jobs");
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
