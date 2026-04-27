"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { normalizeLineItems } from "@/lib/job-items";
import type { Customer, Job } from "@/lib/types";

type DataState<T> = {
  data: T[];
  loading: boolean;
  error: string;
};

function initialState<T>(): DataState<T> {
  return {
    data: [],
    loading: true,
    error: ""
  };
}

export function useCustomers(userId?: string) {
  const [state, setState] = useState<DataState<Customer>>(initialState);

  useEffect(() => {
    if (!userId || !db) {
      setState({ data: [], loading: false, error: "" });
      return;
    }

    const ref = query(
      collection(db, "users", userId, "customers"),
      orderBy("name", "asc")
    );

    return onSnapshot(
      ref,
      (snapshot) => {
        setState({
          data: snapshot.docs.map((document) => {
            const value = document.data();

            return {
              id: document.id,
              name: String(value.name || ""),
              phone: String(value.phone || ""),
              email: String(value.email || ""),
              address: String(value.address || ""),
              addressLine1: String(value.addressLine1 || value.address || ""),
              addressLine2: String(value.addressLine2 || ""),
              suburb: String(value.suburb || ""),
              state: String(value.state || "WA"),
              postcode: String(value.postcode || "")
            };
          }),
          loading: false,
          error: ""
        });
      },
      (error) => {
        setState({ data: [], loading: false, error: error.message });
      }
    );
  }, [userId]);

  return state;
}

export function useJobs(userId?: string) {
  const [state, setState] = useState<DataState<Job>>(initialState);

  useEffect(() => {
    if (!userId || !db) {
      setState({ data: [], loading: false, error: "" });
      return;
    }

    const ref = query(
      collection(db, "users", userId, "jobs"),
      orderBy("date", "asc")
    );

    return onSnapshot(
      ref,
      (snapshot) => {
        setState({
          data: snapshot.docs.map((document) => {
            const value = document.data();

            const job = {
              id: document.id,
              customerId: String(value.customerId || ""),
              customerName: String(value.customerName || ""),
              serviceType: value.serviceType || "Custom",
              serviceDescription: String(value.serviceDescription || ""),
              lineItems: Array.isArray(value.lineItems) ? value.lineItems : [],
              price: Number(value.price || 0),
              date: String(value.date || ""),
              time: String(value.time || ""),
              notes: String(value.notes || ""),
              jobStatus:
                value.jobStatus === "Completed" || value.paymentStatus === "Paid"
                  ? "Completed"
                  : "Scheduled",
              paymentStatus: value.paymentStatus === "Paid" ? "Paid" : "Unpaid",
              paymentMethod: String(value.paymentMethod || "") as Job["paymentMethod"]
            } satisfies Job;

            return {
              ...job,
              lineItems: normalizeLineItems(job)
            };
          }),
          loading: false,
          error: ""
        });
      },
      (error) => {
        setState({ data: [], loading: false, error: error.message });
      }
    );
  }, [userId]);

  return state;
}
