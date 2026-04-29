"use client";

import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { normalizeLineItems } from "@/lib/job-items";
import type {
  BusinessInvoice,
  CatalogItem,
  Customer,
  Job,
  Quote,
  ReceivedPayment
} from "@/lib/types";

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
              propertyType: value.propertyType || "House",
              bedrooms: Number(value.bedrooms || 0),
              bathrooms: Number(value.bathrooms || 0),
              windowPackage: String(value.windowPackage || ""),
              quoteRequired: Boolean(value.quoteRequired || false),
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

export function useItems(userId?: string) {
  const [state, setState] = useState<DataState<CatalogItem>>(initialState);

  useEffect(() => {
    if (!userId || !db) {
      setState({ data: [], loading: false, error: "" });
      return;
    }

    const ref = query(collection(db, "users", userId, "items"), orderBy("name", "asc"));

    return onSnapshot(
      ref,
      (snapshot) => {
        setState({
          data: snapshot.docs.map((document) => {
            const value = document.data();

            return {
              id: document.id,
              type: value.type === "Goods" ? "Goods" : "Service",
              name: String(value.name || ""),
              description: String(value.description || ""),
              unit: String(value.unit || "service"),
              rate: Number(value.rate || 0),
              taxable: value.taxable !== false
            };
          }),
          loading: false,
          error: ""
        });
      },
      (error) => setState({ data: [], loading: false, error: error.message })
    );
  }, [userId]);

  return state;
}

export function useQuotes(userId?: string) {
  const [state, setState] = useState<DataState<Quote>>(initialState);

  useEffect(() => {
    if (!userId || !db) {
      setState({ data: [], loading: false, error: "" });
      return;
    }

    const ref = query(collection(db, "publicQuotes"), where("ownerId", "==", userId));

    return onSnapshot(
      ref,
      (snapshot) => {
        const quotes = snapshot.docs.map((document) => {
          const value = document.data();
          const quote = {
            id: document.id,
            ownerId: String(value.ownerId || ""),
            publicToken: String(value.publicToken || document.id),
            quoteNumber: String(value.quoteNumber || ""),
            customerId: String(value.customerId || ""),
            customerName: String(value.customerName || ""),
            customerEmail: String(value.customerEmail || ""),
            customerPhone: String(value.customerPhone || ""),
            customerAddress: String(value.customerAddress || ""),
            date: String(value.date || ""),
            expiryDate: String(value.expiryDate || ""),
            lineItems: Array.isArray(value.lineItems) ? value.lineItems : [],
            notes: String(value.notes || ""),
            terms: String(value.terms || ""),
            status: value.status || "Draft",
            total: Number(value.total || 0),
            sentAt: String(value.sentAt || ""),
            respondedAt: String(value.respondedAt || "")
          } satisfies Quote;

          return {
            ...quote,
            lineItems: normalizeLineItems({
              lineItems: quote.lineItems,
              serviceDescription: "",
              price: quote.total
            })
          };
        });

        setState({
          data: quotes.sort((a, b) => b.date.localeCompare(a.date)),
          loading: false,
          error: ""
        });
      },
      (error) => setState({ data: [], loading: false, error: error.message })
    );
  }, [userId]);

  return state;
}

export function usePublicQuote(token?: string) {
  const [state, setState] = useState<{ data: Quote | null; loading: boolean; error: string }>({
    data: null,
    loading: true,
    error: ""
  });

  useEffect(() => {
    if (!token || !db) {
      setState({ data: null, loading: false, error: "" });
      return;
    }

    return onSnapshot(
      doc(db, "publicQuotes", token),
      (snapshot) => {
        if (!snapshot.exists()) {
          setState({ data: null, loading: false, error: "Quote not found." });
          return;
        }

        const value = snapshot.data();
        const quote = {
          id: snapshot.id,
          ownerId: String(value.ownerId || ""),
          publicToken: String(value.publicToken || snapshot.id),
          quoteNumber: String(value.quoteNumber || ""),
          customerId: String(value.customerId || ""),
          customerName: String(value.customerName || ""),
          customerEmail: String(value.customerEmail || ""),
          customerPhone: String(value.customerPhone || ""),
          customerAddress: String(value.customerAddress || ""),
          date: String(value.date || ""),
          expiryDate: String(value.expiryDate || ""),
          lineItems: Array.isArray(value.lineItems) ? value.lineItems : [],
          notes: String(value.notes || ""),
          terms: String(value.terms || ""),
          status: value.status || "Sent",
          total: Number(value.total || 0),
          sentAt: String(value.sentAt || ""),
          respondedAt: String(value.respondedAt || "")
        } satisfies Quote;

        setState({
          data: {
            ...quote,
            lineItems: normalizeLineItems({
              lineItems: quote.lineItems,
              serviceDescription: "",
              price: quote.total
            })
          },
          loading: false,
          error: ""
        });
      },
      (error) => setState({ data: null, loading: false, error: error.message })
    );
  }, [token]);

  return state;
}

export function useInvoices(userId?: string) {
  const [state, setState] = useState<DataState<BusinessInvoice>>(initialState);

  useEffect(() => {
    if (!userId || !db) {
      setState({ data: [], loading: false, error: "" });
      return;
    }

    const ref = query(collection(db, "users", userId, "invoices"), orderBy("date", "desc"));

    return onSnapshot(
      ref,
      (snapshot) => {
        setState({
          data: snapshot.docs.map((document) => {
            const value = document.data();

            return {
              id: document.id,
              invoiceNumber: String(value.invoiceNumber || ""),
              customerId: String(value.customerId || ""),
              customerName: String(value.customerName || ""),
              customerEmail: String(value.customerEmail || ""),
              customerPhone: String(value.customerPhone || ""),
              customerAddress: String(value.customerAddress || ""),
              date: String(value.date || ""),
              dueDate: String(value.dueDate || ""),
              lineItems: normalizeLineItems({
                lineItems: Array.isArray(value.lineItems) ? value.lineItems : [],
                serviceDescription: "",
                price: Number(value.total || 0)
              }),
              notes: String(value.notes || ""),
              terms: String(value.terms || ""),
              paymentOptions: Array.isArray(value.paymentOptions) ? value.paymentOptions : [],
              status: value.status || "Draft",
              total: Number(value.total || 0),
              balanceDue: Number(value.balanceDue || 0)
            };
          }),
          loading: false,
          error: ""
        });
      },
      (error) => setState({ data: [], loading: false, error: error.message })
    );
  }, [userId]);

  return state;
}

export function usePayments(userId?: string) {
  const [state, setState] = useState<DataState<ReceivedPayment>>(initialState);

  useEffect(() => {
    if (!userId || !db) {
      setState({ data: [], loading: false, error: "" });
      return;
    }

    const ref = query(collection(db, "users", userId, "payments"), orderBy("date", "desc"));

    return onSnapshot(
      ref,
      (snapshot) => {
        setState({
          data: snapshot.docs.map((document) => {
            const value = document.data();

            return {
              id: document.id,
              date: String(value.date || ""),
              paymentNumber: String(value.paymentNumber || ""),
              referenceNumber: String(value.referenceNumber || ""),
              customerName: String(value.customerName || ""),
              invoiceNumber: String(value.invoiceNumber || ""),
              mode: value.mode || "Bank Transfer",
              amount: Number(value.amount || 0)
            };
          }),
          loading: false,
          error: ""
        });
      },
      (error) => setState({ data: [], loading: false, error: error.message })
    );
  }, [userId]);

  return state;
}
