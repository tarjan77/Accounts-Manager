"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { DocumentLineItems } from "@/components/document-line-items";
import { FileIcon, MailIcon, PlusIcon } from "@/components/icons";
import { LogoUploader } from "@/components/logo-uploader";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/components/auth-provider";
import { createInvoice, updateInvoice } from "@/lib/firestore";
import { formatAddress } from "@/lib/address";
import {
  blankLineItem,
  defaultInvoiceNotes,
  defaultTerms,
  documentTotal,
  nextDocumentNumber
} from "@/lib/documents";
import { formatCurrency, formatDate, todayISO } from "@/lib/format";
import { generateDocumentPdf } from "@/lib/document-pdf";
import { useBusinessSettings, useCustomers, useInvoices, useItems } from "@/lib/hooks";
import type {
  BusinessInvoice,
  BusinessInvoiceInput,
  CatalogItem,
  Customer,
  InvoiceLineItem,
  InvoiceStatus
} from "@/lib/types";

const paymentOptions = ["Bank Transfer", "Stripe", "PayPal"] as const;

function blankInvoice(existingCount: number): BusinessInvoiceInput {
  return {
    invoiceNumber: nextDocumentNumber("INV", existingCount),
    customerId: "",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerAddress: "",
    date: todayISO(),
    dueDate: todayISO(),
    lineItems: [blankLineItem()],
    notes: defaultInvoiceNotes,
    terms: defaultTerms,
    paymentOptions: ["Bank Transfer"],
    status: "Draft"
  };
}

function invoiceToInput(invoice: BusinessInvoice): BusinessInvoiceInput {
  return {
    invoiceNumber: invoice.invoiceNumber,
    customerId: invoice.customerId,
    customerName: invoice.customerName,
    customerEmail: invoice.customerEmail,
    customerPhone: invoice.customerPhone || "",
    customerAddress: invoice.customerAddress || "",
    date: invoice.date,
    dueDate: invoice.dueDate,
    lineItems: invoice.lineItems,
    notes: invoice.notes,
    terms: invoice.terms,
    paymentOptions: invoice.paymentOptions,
    status: invoice.status
  };
}

export function InvoicesPage() {
  const { user } = useAuth();
  const customers = useCustomers(user?.uid);
  const catalogItems = useItems(user?.uid);
  const invoices = useInvoices(user?.uid);
  const settings = useBusinessSettings(user?.uid);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BusinessInvoice | null>(null);
  const [form, setForm] = useState<BusinessInvoiceInput>(() => blankInvoice(0));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const summary = useMemo(() => {
    const outstanding = invoices.data.reduce((total, invoice) => total + invoice.balanceDue, 0);
    const dueToday = invoices.data
      .filter((invoice) => invoice.dueDate === todayISO() && invoice.balanceDue > 0)
      .reduce((total, invoice) => total + invoice.balanceDue, 0);
    const overdue = invoices.data
      .filter((invoice) => invoice.dueDate < todayISO() && invoice.balanceDue > 0)
      .reduce((total, invoice) => total + invoice.balanceDue, 0);
    const paid = invoices.data
      .filter((invoice) => invoice.status === "Paid")
      .reduce((total, invoice) => total + invoice.total, 0);

    return { outstanding, dueToday, overdue, paid };
  }, [invoices.data]);

  useEffect(() => {
    if (editing) {
      setForm(invoiceToInput(editing));
      setFormOpen(true);
    }
  }, [editing]);

  function openNew() {
    setEditing(null);
    setForm(blankInvoice(invoices.data.length));
    setMessage("");
    setFormOpen(true);
  }

  function closeForm() {
    setEditing(null);
    setFormOpen(false);
    setSaving(false);
  }

  async function saveInvoice(sendNow: boolean) {
    if (!user) {
      return;
    }

    setSaving(true);
    setMessage("");

    const input: BusinessInvoiceInput = {
      ...form,
      lineItems: form.lineItems.filter((item) => item.description.trim()),
      status: sendNow && form.status === "Draft" ? "Sent" : form.status
    };

    try {
      if (editing) {
        await updateInvoice(user.uid, editing.id, input);
      } else {
        await createInvoice(user.uid, input);
      }

      if (sendNow && input.customerEmail) {
        const subject = `Invoice ${input.invoiceNumber} from Shree Cleaning`;
        const body = [
          `Dear ${input.customerName || "Customer"},`,
          "",
          "Your Shree Cleaning invoice is ready. Bank transfer is preferred to avoid processing fees.",
          "",
          `Invoice total: ${formatCurrency(documentTotal(input.lineItems))}`,
          "",
          "Regards,",
          "Shree Cleaning"
        ].join("\n");
        window.location.href = `mailto:${input.customerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        setMessage("Invoice saved. An email draft opened for the customer.");
      } else {
        setMessage("Invoice saved.");
      }

      closeForm();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save invoice.");
    } finally {
      setSaving(false);
    }
  }

  async function downloadPdf(invoice: BusinessInvoice) {
    await generateDocumentPdf({
      type: "Invoice",
      number: invoice.invoiceNumber,
      date: invoice.date,
      dueDate: invoice.dueDate,
      customerName: invoice.customerName,
      customerEmail: invoice.customerEmail,
      customerPhone: invoice.customerPhone,
      customerAddress: invoice.customerAddress,
      lineItems: invoice.lineItems,
      notes: invoice.notes,
      terms: invoice.terms,
      paymentOptions: invoice.paymentOptions,
      status: invoice.status,
      logoDataUrl: settings.data.logoDataUrl
    });
  }

  return (
    <>
      <PageHeader eyebrow="Invoices" title="All invoices">
        <button className="btn-primary gap-2" onClick={openNew} type="button">
          <PlusIcon className="h-4 w-4" />
          New invoice
        </button>
      </PageHeader>

      <section className="mb-5 grid gap-3 md:grid-cols-4">
        <MiniStat label="Outstanding receivables" value={formatCurrency(summary.outstanding)} />
        <MiniStat label="Due today" value={formatCurrency(summary.dueToday)} />
        <MiniStat label="Overdue" value={formatCurrency(summary.overdue)} tone="amber" />
        <MiniStat label="Paid invoices" value={formatCurrency(summary.paid)} />
      </section>

      <section className="mb-5">
        <LogoUploader />
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-line p-5">
          <h3 className="font-semibold text-ink">Invoice list</h3>
          <p className="mt-1 text-sm text-muted">
            Create invoices with bank transfer, Stripe, or PayPal shown as accepted payment options.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead className="bg-mist text-xs uppercase tracking-[0.12em] text-muted">
              <tr>
                <th className="border-b border-line px-5 py-3 font-semibold">Date</th>
                <th className="border-b border-line px-5 py-3 font-semibold">Invoice #</th>
                <th className="border-b border-line px-5 py-3 font-semibold">Customer</th>
                <th className="border-b border-line px-5 py-3 font-semibold">Status</th>
                <th className="border-b border-line px-5 py-3 font-semibold">Due date</th>
                <th className="border-b border-line px-5 py-3 text-right font-semibold">Amount</th>
                <th className="border-b border-line px-5 py-3 text-right font-semibold">Balance due</th>
                <th className="border-b border-line px-5 py-3 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {invoices.loading ? (
                <tr>
                  <td className="px-5 py-5 text-muted" colSpan={8}>
                    Loading invoices...
                  </td>
                </tr>
              ) : invoices.error ? (
                <tr>
                  <td className="px-5 py-5 text-danger-600" colSpan={8}>
                    {invoices.error}
                  </td>
                </tr>
              ) : invoices.data.length ? (
                invoices.data.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="border-b border-line px-5 py-4">{formatDate(invoice.date)}</td>
                    <td className="border-b border-line px-5 py-4">
                      <button
                        className="font-semibold text-brand-700"
                        onClick={() => setEditing(invoice)}
                        type="button"
                      >
                        {invoice.invoiceNumber}
                      </button>
                    </td>
                    <td className="border-b border-line px-5 py-4">{invoice.customerName}</td>
                    <td className="border-b border-line px-5 py-4">
                      <StatusBadge status={invoice.status} />
                    </td>
                    <td className="border-b border-line px-5 py-4">{formatDate(invoice.dueDate)}</td>
                    <td className="border-b border-line px-5 py-4 text-right font-semibold">
                      {formatCurrency(invoice.total)}
                    </td>
                    <td className="border-b border-line px-5 py-4 text-right font-semibold">
                      {formatCurrency(invoice.balanceDue)}
                    </td>
                    <td className="border-b border-line px-5 py-4 text-right">
                      <button className="btn-secondary min-h-9 px-3" onClick={() => downloadPdf(invoice)} type="button">
                        PDF
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-5 py-5 text-muted" colSpan={8}>
                    No invoices yet.
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

      <Modal onClose={closeForm} open={formOpen} size="lg" title={editing ? "Edit invoice" : "New invoice"}>
        <InvoiceForm
          catalogItems={catalogItems.data}
          customers={customers.data}
          form={form}
          onChange={setForm}
          onSave={saveInvoice}
          saving={saving}
        />
      </Modal>
    </>
  );
}

function InvoiceForm({
  form,
  customers,
  catalogItems,
  saving,
  onChange,
  onSave
}: {
  form: BusinessInvoiceInput;
  customers: Customer[];
  catalogItems: CatalogItem[];
  saving: boolean;
  onChange: (form: BusinessInvoiceInput) => void;
  onSave: (sendNow: boolean) => void;
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave(false);
  }

  function selectCustomer(customerId: string) {
    const customer = customers.find((item) => item.id === customerId);
    onChange({
      ...form,
      customerId,
      customerName: customer?.name || "",
      customerEmail: customer?.email || "",
      customerPhone: customer?.phone || "",
      customerAddress: customer ? formatAddress(customer) : ""
    });
  }

  function togglePaymentOption(option: (typeof paymentOptions)[number]) {
    const next = form.paymentOptions.includes(option)
      ? form.paymentOptions.filter((item) => item !== option)
      : [...form.paymentOptions, option];

    onChange({ ...form, paymentOptions: next });
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr]">
        <label className="block">
          <span className="field-label">Customer name</span>
          <select
            className="field"
            onChange={(event) => selectCustomer(event.target.value)}
            required
            value={form.customerId}
          >
            <option value="">Select or add a customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="field-label">Invoice number</span>
          <input
            className="field"
            onChange={(event) => onChange({ ...form, invoiceNumber: event.target.value })}
            required
            value={form.invoiceNumber}
          />
        </label>
        <label className="block">
          <span className="field-label">Status</span>
          <select
            className="field"
            onChange={(event) =>
              onChange({ ...form, status: event.target.value as InvoiceStatus })
            }
            value={form.status}
          >
            {(["Draft", "Sent", "Due Today", "Overdue", "Paid"] as InvoiceStatus[]).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <label className="block">
          <span className="field-label">Invoice date</span>
          <input
            className="field"
            onChange={(event) => onChange({ ...form, date: event.target.value })}
            required
            type="date"
            value={form.date}
          />
        </label>
        <label className="block">
          <span className="field-label">Due date</span>
          <input
            className="field"
            onChange={(event) => onChange({ ...form, dueDate: event.target.value })}
            required
            type="date"
            value={form.dueDate}
          />
        </label>
        <label className="block">
          <span className="field-label">Customer email</span>
          <input
            className="field"
            onChange={(event) => onChange({ ...form, customerEmail: event.target.value })}
            placeholder="customer@example.com"
            type="email"
            value={form.customerEmail}
          />
        </label>
      </section>

      <DocumentLineItems
        catalogItems={catalogItems}
        items={form.lineItems}
        onChange={(lineItems: InvoiceLineItem[]) => onChange({ ...form, lineItems })}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-4">
          <label className="block">
            <span className="field-label">Customer notes</span>
            <textarea
              className="field min-h-24 resize-y"
              onChange={(event) => onChange({ ...form, notes: event.target.value })}
              value={form.notes}
            />
          </label>
          <label className="block">
            <span className="field-label">Terms and conditions</span>
            <textarea
              className="field min-h-28 resize-y"
              onChange={(event) => onChange({ ...form, terms: event.target.value })}
              value={form.terms}
            />
          </label>
        </div>

        <div className="rounded-lg border border-line bg-mist p-5">
          <p className="text-sm font-medium text-muted">Total</p>
          <p className="mt-2 text-3xl font-semibold text-ink">
            {formatCurrency(documentTotal(form.lineItems))}
          </p>

          <div className="mt-5">
            <p className="field-label">Accepted payment options</p>
            <div className="mt-2 grid gap-2">
              {paymentOptions.map((option) => (
                <label
                  className="flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink"
                  key={option}
                >
                  <input
                    checked={form.paymentOptions.includes(option)}
                    onChange={() => togglePaymentOption(option)}
                    type="checkbox"
                  />
                  {option}
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs leading-5 text-muted">
              Bank transfer stays highlighted in the notes to avoid processing fees.
            </p>
          </div>

          <div className="mt-5 grid gap-2">
            <button className="btn-secondary gap-2" disabled={saving} type="submit">
              <FileIcon className="h-4 w-4" />
              Save draft
            </button>
            <button
              className="btn-primary gap-2"
              disabled={saving}
              onClick={() => onSave(true)}
              type="button"
            >
              <MailIcon className="h-4 w-4" />
              Save and email
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

function MiniStat({
  label,
  value,
  tone = "brand"
}: {
  label: string;
  value: string;
  tone?: "brand" | "amber";
}) {
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${tone === "amber" ? "text-amber-500" : "text-ink"}`}>
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "Paid"
      ? "bg-brand-50 text-brand-700"
      : status === "Overdue"
        ? "bg-danger-500/10 text-danger-600"
        : status === "Due Today"
          ? "bg-amber-500/10 text-amber-500"
          : "bg-water-500/10 text-water-600";

  return <span className={`badge ${tone}`}>{status}</span>;
}
