"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
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
              address: String(value.address || "")
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

            return {
              id: document.id,
              customerId: String(value.customerId || ""),
              customerName: String(value.customerName || ""),
              serviceDescription: String(value.serviceDescription || ""),
              price: Number(value.price || 0),
              date: String(value.date || ""),
              time: String(value.time || ""),
              notes: String(value.notes || ""),
              paymentStatus: value.paymentStatus === "Paid" ? "Paid" : "Unpaid",
              paymentMethod: String(value.paymentMethod || "") as Job["paymentMethod"]
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
