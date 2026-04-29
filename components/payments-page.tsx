"use client";

import { FormEvent, useMemo, useState } from "react";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { PlusIcon } from "@/components/icons";
import { useAuth } from "@/components/auth-provider";
import { createPayment, updateInvoice } from "@/lib/firestore";
import { nextDocumentNumber } from "@/lib/documents";
import { formatCurrency, formatDate, todayISO } from "@/lib/format";
import { useCustomers, useInvoices, usePayments } from "@/lib/hooks";
import type {
  BusinessInvoice,
  BusinessInvoiceInput,
  ReceivedPaymentInput
} from "@/lib/types";

const paymentModes = ["Bank Transfer", "Cash", "Stripe", "PayPal", "Other"] as const;

function blankPayment(existingCount: number): ReceivedPaymentInput {
  return {
    date: todayISO(),
    paymentNumber: nextDocumentNumber("PAY", existingCount),
    referenceNumber: "",
    customerName: "",
    invoiceNumber: "",
    mode: "Bank Transfer",
    amount: 0
  };
}

function invoiceToInput(invoice: BusinessInvoice, status = invoice.status): BusinessInvoiceInput {
  return {
    invoiceNumber: invoice.invoiceNumber,
    customerId: invoice.customerId,
    customerName: invoice.customerName,
    customerEmail: invoice.customerEmail,
    date: invoice.date,
    dueDate: invoice.dueDate,
    lineItems: invoice.lineItems,
    notes: invoice.notes,
    terms: invoice.terms,
    paymentOptions: invoice.paymentOptions,
    status
  };
}

export function PaymentsPage() {
  const { user } = useAuth();
  const customers = useCustomers(user?.uid);
  const invoices = useInvoices(user?.uid);
  const payments = usePayments(user?.uid);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<ReceivedPaymentInput>(() => blankPayment(0));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const totalReceived = useMemo(
    () => payments.data.reduce((total, payment) => total + payment.amount, 0),
    [payments.data]
  );

  function openNew() {
    setForm(blankPayment(payments.data.length));
    setMessage("");
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setSaving(false);
  }

  function selectInvoice(invoiceId: string) {
    const invoice = invoices.data.find((item) => item.id === invoiceId);

    if (!invoice) {
      setForm({ ...form, invoiceNumber: "" });
      return;
    }

    setForm({
      ...form,
      customerName: invoice.customerName,
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.balanceDue || invoice.total
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      await createPayment(user.uid, form);

      const invoice = invoices.data.find((item) => item.invoiceNumber === form.invoiceNumber);
      if (invoice && form.amount >= invoice.balanceDue) {
        await updateInvoice(user.uid, invoice.id, invoiceToInput(invoice, "Paid"));
      }

      setMessage("Payment recorded.");
      closeForm();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not record payment.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Payments" title="Payments received">
        <button className="btn-primary gap-2" onClick={openNew} type="button">
          <PlusIcon className="h-4 w-4" />
          New payment
        </button>
      </PageHeader>

      <section className="mb-5 grid gap-3 md:grid-cols-3">
        <MiniStat label="Total received" value={formatCurrency(totalReceived)} />
        <MiniStat label="Payment records" value={payments.data.length.toString()} />
        <MiniStat
          label="Bank transfers"
          value={payments.data.filter((payment) => payment.mode === "Bank Transfer").length.toString()}
        />
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-line p-5">
          <h3 className="font-semibold text-ink">All received payments</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead className="bg-mist text-xs uppercase tracking-[0.12em] text-muted">
              <tr>
                <th className="border-b border-line px-5 py-3 font-semibold">Date</th>
                <th className="border-b border-line px-5 py-3 font-semibold">Payment #</th>
                <th className="border-b border-line px-5 py-3 font-semibold">Reference</th>
                <th className="border-b border-line px-5 py-3 font-semibold">Customer</th>
                <th className="border-b border-line px-5 py-3 font-semibold">Invoice #</th>
                <th className="border-b border-line px-5 py-3 font-semibold">Mode</th>
                <th className="border-b border-line px-5 py-3 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {payments.loading ? (
                <tr>
                  <td className="px-5 py-5 text-muted" colSpan={7}>
                    Loading payments...
                  </td>
                </tr>
              ) : payments.error ? (
                <tr>
                  <td className="px-5 py-5 text-danger-600" colSpan={7}>
                    {payments.error}
                  </td>
                </tr>
              ) : payments.data.length ? (
                payments.data.map((payment) => (
                  <tr key={payment.id}>
                    <td className="border-b border-line px-5 py-4">{formatDate(payment.date)}</td>
                    <td className="border-b border-line px-5 py-4 font-semibold text-brand-700">
                      {payment.paymentNumber}
                    </td>
                    <td className="border-b border-line px-5 py-4 text-muted">
                      {payment.referenceNumber || "-"}
                    </td>
                    <td className="border-b border-line px-5 py-4">{payment.customerName}</td>
                    <td className="border-b border-line px-5 py-4">{payment.invoiceNumber || "-"}</td>
                    <td className="border-b border-line px-5 py-4">{payment.mode}</td>
                    <td className="border-b border-line px-5 py-4 text-right font-semibold">
                      {formatCurrency(payment.amount)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-5 py-5 text-muted" colSpan={7}>
                    No payments recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {message ? (
        <p className="mt-5 rounded-md border border-brand-100 bg-brand-50 p-4 text-sm text-brand-700">
          {message}
        </p>
      ) : null}

      <Modal onClose={closeForm} open={formOpen} title="New payment">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="field-label">Date</span>
              <input
                className="field"
                onChange={(event) => setForm({ ...form, date: event.target.value })}
                required
                type="date"
                value={form.date}
              />
            </label>
            <label className="block">
              <span className="field-label">Payment number</span>
              <input
                className="field"
                onChange={(event) => setForm({ ...form, paymentNumber: event.target.value })}
                required
                value={form.paymentNumber}
              />
            </label>
          </div>

          <label className="block">
            <span className="field-label">
              Invoice <span className="label-optional">(optional)</span>
            </span>
            <select className="field" onChange={(event) => selectInvoice(event.target.value)} value="">
              <option value="">Select invoice</option>
              {invoices.data.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.invoiceNumber} - {invoice.customerName} - {formatCurrency(invoice.balanceDue || invoice.total)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="field-label">Customer</span>
            <input
              className="field"
              list="payment-customers"
              onChange={(event) => setForm({ ...form, customerName: event.target.value })}
              required
              value={form.customerName}
            />
            <datalist id="payment-customers">
              {customers.data.map((customer) => (
                <option key={customer.id} value={customer.name} />
              ))}
            </datalist>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="field-label">Payment mode</span>
              <select
                className="field"
                onChange={(event) =>
                  setForm({
                    ...form,
                    mode: event.target.value as ReceivedPaymentInput["mode"]
                  })
                }
                value={form.mode}
              >
                {paymentModes.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="field-label">Amount</span>
              <input
                className="field"
                min="0"
                onChange={(event) => setForm({ ...form, amount: Number(event.target.value) })}
                required
                step="0.01"
                type="number"
                value={form.amount || ""}
              />
            </label>
          </div>

          <label className="block">
            <span className="field-label">
              Reference number <span className="label-optional">(optional)</span>
            </span>
            <input
              className="field"
              onChange={(event) => setForm({ ...form, referenceNumber: event.target.value })}
              value={form.referenceNumber || ""}
            />
          </label>

          <button className="btn-primary w-full" disabled={saving} type="submit">
            {saving ? "Saving..." : "Save payment"}
          </button>
        </form>
      </Modal>
    </>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}
