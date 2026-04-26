import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
import { requireDb } from "@/lib/firebase";
import type { CustomerInput, JobInput, PaymentMethod } from "@/lib/types";

export function customersPath(userId: string) {
  return collection(requireDb(), "users", userId, "customers");
}

export function jobsPath(userId: string) {
  return collection(requireDb(), "users", userId, "jobs");
}

export async function createCustomer(userId: string, input: CustomerInput) {
  const ref = await addDoc(customersPath(userId), {
    ...input,
    email: input.email || "",
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
  await updateDoc(doc(requireDb(), "users", userId, "customers", customerId), {
    ...input,
    email: input.email || "",
    updatedAt: serverTimestamp()
  });
}

export async function deleteCustomer(userId: string, customerId: string) {
  await deleteDoc(doc(requireDb(), "users", userId, "customers", customerId));
}

export async function createJob(userId: string, input: JobInput) {
  const ref = await addDoc(jobsPath(userId), {
    ...input,
    price: Number(input.price) || 0,
    time: input.time || "",
    notes: input.notes || "",
    paymentMethod: input.paymentMethod || "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return ref.id;
}

export async function updateJob(userId: string, jobId: string, input: JobInput) {
  await updateDoc(doc(requireDb(), "users", userId, "jobs", jobId), {
    ...input,
    price: Number(input.price) || 0,
    time: input.time || "",
    notes: input.notes || "",
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
    paymentMethod: paymentMethod || "Bank Transfer",
    paidAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}
