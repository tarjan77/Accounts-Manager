"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DocumentLineItems } from "@/components/document-line-items";
import { FileIcon, MailIcon, PlusIcon } from "@/components/icons";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { QuickCustomerModal } from "@/components/quick-customer-modal";
import { useAuth } from "@/components/auth-provider";
import { createQuote, updateQuote } from "@/lib/firestore";
import { formatAddress } from "@/lib/address";
import {
  blankLineItem,
  cleanEmail,
  defaultQuoteNotes,
  defaultQuoteTerms,
  documentTotal,
  nextDocumentNumber
} from "@/lib/documents";
import { formatCurrency, formatDate, todayISO } from "@/lib/format";
import { createDocumentPdfAttachment, generateDocumentPdf } from "@/lib/document-pdf";
import { emailButton, escapeHtml, sendConnectedGmailEmail } from "@/lib/email-client";
import { useBusinessSettings, useCustomers, useItems, useQuotes } from "@/lib/hooks";
import type {
  CatalogItem,
  Customer,
  InvoiceLineItem,
  Quote,
  QuoteInput,
  QuoteStatus
} from "@/lib/types";

function newToken() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function blankQuote(existingQuotes: Quote[]): QuoteInput {
  return {
    publicToken: newToken(),
    quoteNumber: nextDocumentNumber("QT", existingQuotes.map((quote) => quote.quoteNumber)),
    customerId: "",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerAddress: "",
    date: todayISO(),
    jobDate: todayISO(),
    jobTime: "",
    expiryDate: "",
    lineItems: [blankLineItem()],
    notes: defaultQuoteNotes,
    terms: defaultQuoteTerms,
    status: "Draft",
    logoDataUrl: ""
  };
}

function quoteToInput(quote: Quote): QuoteInput {
  return {
    publicToken: quote.publicToken,
    quoteNumber: quote.quoteNumber,
    customerId: quote.customerId,
    customerName: quote.customerName,
    customerEmail: quote.customerEmail,
    customerPhone: quote.customerPhone || "",
    customerAddress: quote.customerAddress || "",
    date: quote.date,
    jobDate: quote.jobDate || quote.date,
    jobTime: quote.jobTime || "",
    expiryDate: quote.expiryDate || "",
    lineItems: quote.lineItems.length ? quote.lineItems : [blankLineItem()],
    notes: quote.notes,
    terms: quote.terms,
    status: quote.status,
    logoDataUrl: quote.logoDataUrl || "",
    sentAt: quote.sentAt
  };
}

export function QuotesPage() {
  const { user } = useAuth();
  const customers = useCustomers(user?.uid);
  const catalogItems = useItems(user?.uid);
  const quotes = useQuotes(user?.uid);
  const settings = useBusinessSettings(user?.uid);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Quote | null>(null);
  const [form, setForm] = useState<QuoteInput>(() => blankQuote([]));
  const [quickCustomerOpen, setQuickCustomerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const totals = useMemo(() => {
    const sent = quotes.data.filter((quote) => quote.status === "Sent").length;
    const accepted = quotes.data.filter((quote) => quote.status === "Accepted").length;
    const openValue = quotes.data
      .filter((quote) => quote.status === "Accepted")
      .reduce((total, quote) => total + quote.total, 0);

    return { sent, accepted, openValue };
  }, [quotes.data]);

  useEffect(() => {
    if (editing) {
      setForm(quoteToInput(editing));
      setFormOpen(true);
    }
  }, [editing]);

  function openNew() {
    setEditing(null);
    setForm(blankQuote(quotes.data));
    setMessage("");
    setFormOpen(true);
  }

  function closeForm() {
    setEditing(null);
    setFormOpen(false);
    setSaving(false);
  }

  async function saveQuote(sendNow: boolean) {
    if (!user) {
      return;
    }

    if (sendNow && !cleanEmail(form.customerEmail)) {
      setMessage("Add the customer's email before sending the quote.");
      return;
    }

    setSaving(true);
    setMessage("");

    const savedInput: QuoteInput = {
      ...form,
      customerEmail: cleanEmail(form.customerEmail),
      lineItems: form.lineItems.filter((item) => item.description.trim()),
      logoDataUrl: settings.data.logoDataUrl || form.logoDataUrl || "",
      sentAt: form.sentAt
    };

    let quoteId = editing?.id || savedInput.publicToken;
    let saved = false;

    try {
      if (editing) {
        await updateQuote(user.uid, editing.id, savedInput);
      } else {
        quoteId = await createQuote(user.uid, savedInput);
      }
      saved = true;

      if (sendNow) {
        const sentInput: QuoteInput = {
          ...savedInput,
          status: "Sent",
          sentAt: new Date().toISOString()
        };

        await sendQuoteEmail(sentInput);
        await updateQuote(user.uid, quoteId, sentInput);
        setMessage("Quote saved and emailed to the customer.");
      } else {
        setMessage("Quote saved as draft.");
      }

      closeForm();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Could not save quote.";
      if (saved && sendNow) {
        setMessage(`Quote saved, but email was not sent: ${errorMessage}`);
        closeForm();
      } else {
        setMessage(errorMessage);
      }
    } finally {
      setSaving(false);
    }
  }

  async function sendQuoteEmail(quote: QuoteInput) {
    const link = `${window.location.origin}/quote/${quote.publicToken}`;
    const subject = `Quote ${quote.quoteNumber} from Shree Cleaning`;
    const attachment = await createDocumentPdfAttachment({
      type: "Quote",
      number: quote.quoteNumber,
      date: quote.date,
      expiryDate: quote.expiryDate,
      customerName: quote.customerName,
      customerEmail: quote.customerEmail,
      customerPhone: quote.customerPhone,
      customerAddress: quote.customerAddress,
      lineItems: quote.lineItems,
      notes: quote.notes,
      terms: quote.terms,
      status: quote.status,
      logoDataUrl: quote.logoDataUrl || settings.data.logoDataUrl
    });
    const html = [
      `<p>Dear ${escapeHtml(quote.customerName || "Customer")},</p>`,
      "<p>Thank you for contacting Shree Cleaning. Your quote is ready to review.</p>",
      `<p>${emailButton("View quote", link)}</p>`,
      "<p>A PDF copy is attached for your records.</p>",
      "<p>Regards,<br/>Shree Cleaning</p>"
    ].join("");
    const text = [
      `Dear ${quote.customerName || "Customer"},`,
      "",
      "Thank you for contacting Shree Cleaning. Your quote is ready to review.",
      "",
      `View quote: ${link}`,
      "",
      "Regards,",
      "Shree Cleaning"
    ].join("\n");

    await sendConnectedGmailEmail(await user!.getIdToken(), {
      to: quote.customerEmail,
      subject,
      html,
      text,
      attachments: [attachment]
    });
  }

  function selectedCustomer(customerId: string) {
    return customers.data.find((customer) => customer.id === customerId);
  }

  async function downloadPdf(quote: Quote) {
    await generateDocumentPdf({
      type: "Quote",
      number: quote.quoteNumber,
      date: quote.date,
      expiryDate: quote.expiryDate,
      customerName: quote.customerName,
      customerEmail: quote.customerEmail,
      customerPhone: quote.customerPhone,
      customerAddress: quote.customerAddress,
      lineItems: quote.lineItems,
      notes: quote.notes,
      terms: quote.terms,
      status: quote.status,
      logoDataUrl: quote.logoDataUrl || settings.data.logoDataUrl
    });
  }

  return (
    <>
      <PageHeader eyebrow="Quotes" title="All quotes">
        <button className="btn-primary gap-2" onClick={openNew} type="button">
          <PlusIcon className="h-4 w-4" />
          New quote
        </button>
      </PageHeader>

      <section className="mb-5 grid grid-cols-3 gap-2 sm:gap-3">
        <MiniStat label="Sent" value={totals.sent.toString()} />
        <MiniStat label="Accepted" value={totals.accepted.toString()} />
        <MiniStat label="Open quote value" value={formatCurrency(totals.openValue)} />
      </section>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line p-5">
          <div>
            <h3 className="font-semibold text-ink">Quote list</h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead className="bg-mist text-xs uppercase tracking-[0.12em] text-muted">
              <tr>
                <th className="border-b border-line px-5 py-3 font-semibold">Date</th>
                <th className="border-b border-line px-5 py-3 font-semibold">Quote number</th>
                <th className="border-b border-line px-5 py-3 font-semibold">Customer</th>
                <th className="border-b border-line px-5 py-3 font-semibold">Status</th>
                <th className="border-b border-line px-5 py-3 text-right font-semibold">Amount</th>
                <th className="border-b border-line px-5 py-3 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {quotes.loading ? (
                <tr>
                  <td className="px-5 py-5 text-muted" colSpan={6}>
                    Loading quotes...
                  </td>
                </tr>
              ) : quotes.error ? (
                <tr>
                  <td className="px-5 py-5 text-danger-600" colSpan={6}>
                    {quotes.error}
                  </td>
                </tr>
              ) : quotes.data.length ? (
                quotes.data.map((quote) => (
                  <tr key={quote.id}>
                    <td className="border-b border-line px-5 py-4">{formatDate(quote.date)}</td>
                    <td className="border-b border-line px-5 py-4">
                      <button
                        className="font-semibold text-brand-700"
                        onClick={() => setEditing(quote)}
                        type="button"
                      >
                        {quote.quoteNumber}
                      </button>
                    </td>
                    <td className="border-b border-line px-5 py-4">
                      <p className="font-semibold text-ink">{quote.customerName}</p>
                      {quote.customerEmail ? (
                        <p className="mt-1 text-xs text-muted">{quote.customerEmail}</p>
                      ) : null}
                    </td>
                    <td className="border-b border-line px-5 py-4">
                      <StatusBadge status={quote.status} />
                    </td>
                    <td className="border-b border-line px-5 py-4 text-right font-semibold">
                      {formatCurrency(quote.total)}
                    </td>
                    <td className="border-b border-line px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Link className="btn-secondary min-h-9 px-3" href={`/quote/${quote.publicToken}`}>
                          View
                        </Link>
                        <button className="btn-secondary min-h-9 px-3" onClick={() => downloadPdf(quote)} type="button">
                          PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-5 py-5 text-muted" colSpan={6}>
                    No quotes yet.
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

      <Modal onClose={closeForm} open={formOpen} size="lg" title={editing ? "Edit quote" : "New quote"}>
        <QuoteForm
          catalogItems={catalogItems.data}
          customers={customers.data}
          form={form}
          onChange={setForm}
          onAddCustomer={() => setQuickCustomerOpen(true)}
          onSave={(sendNow) => saveQuote(sendNow)}
          saving={saving}
          selectedCustomer={selectedCustomer(form.customerId)}
        />
      </Modal>

      <QuickCustomerModal
        onClose={() => setQuickCustomerOpen(false)}
        onCreated={(customer) => {
          setForm((current) => ({
            ...current,
            customerId: customer.id,
            customerName: customer.name,
            customerEmail: customer.email || "",
            customerPhone: customer.phone || "",
            customerAddress: formatAddress(customer)
          }));
        }}
        open={quickCustomerOpen}
      />
    </>
  );
}

function QuoteForm({
  form,
  customers,
  catalogItems,
  selectedCustomer,
  saving,
  onChange,
  onAddCustomer,
  onSave
}: {
  form: QuoteInput;
  customers: Customer[];
  catalogItems: CatalogItem[];
  selectedCustomer?: Customer;
  saving: boolean;
  onChange: (form: QuoteInput) => void;
  onAddCustomer: () => void;
  onSave: (sendNow: boolean) => void;
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave(false);
  }

  function selectCustomer(customerId: string) {
    if (customerId === "__add_customer__") {
      onAddCustomer();
      return;
    }

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

  const customerOptions = [...customers].sort(
    (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
  );

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
            <option value="">Select a customer</option>
            {customerOptions.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
            <option value="__add_customer__">+ Add customer</option>
          </select>
        </label>
        <label className="block">
          <span className="field-label">Quote number</span>
          <input
            className="field"
            onChange={(event) => onChange({ ...form, quoteNumber: event.target.value })}
            required
            value={form.quoteNumber}
          />
        </label>
        <label className="block">
          <span className="field-label">Status</span>
          <select
            className="field"
            onChange={(event) =>
              onChange({ ...form, status: event.target.value as QuoteStatus })
            }
            value={form.status}
          >
            {(["Draft", "Sent", "Accepted", "Declined", "Invoiced"] as QuoteStatus[]).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        <label className="block">
          <span className="field-label">Quote date</span>
          <input
            className="field"
            onChange={(event) => onChange({ ...form, date: event.target.value })}
            required
            type="date"
            value={form.date}
          />
        </label>
        <label className="block">
          <span className="field-label">Job date</span>
          <input
            className="field"
            onChange={(event) => onChange({ ...form, jobDate: event.target.value })}
            required
            type="date"
            value={form.jobDate || form.date}
          />
        </label>
        <label className="block">
          <span className="field-label">
            Job time <span className="label-optional">(optional)</span>
          </span>
          <input
            className="field"
            onChange={(event) => onChange({ ...form, jobTime: event.target.value })}
            type="time"
            value={form.jobTime || ""}
          />
        </label>
        <label className="block">
          <span className="field-label">
            Expiry date <span className="label-optional">(optional)</span>
          </span>
          <input
            className="field"
            onChange={(event) => onChange({ ...form, expiryDate: event.target.value })}
            type="date"
            value={form.expiryDate || ""}
          />
        </label>
        <label className="block lg:col-span-4">
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

      {selectedCustomer ? (
        <div className="rounded-md border border-line bg-mist p-4 text-sm text-muted">
          Selected customer: <span className="font-semibold text-ink">{selectedCustomer.name}</span>
          {selectedCustomer.phone ? ` - ${selectedCustomer.phone}` : ""}
        </div>
      ) : null}

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
          <div className="mt-5 grid gap-2">
            <button
              className="btn-secondary gap-2"
              disabled={saving}
              onClick={() => onSave(false)}
              type="button"
            >
              <FileIcon className="h-4 w-4" />
              Save as draft
            </button>
            <button
              className="btn-primary gap-2"
              disabled={saving}
              onClick={() => onSave(true)}
              type="button"
            >
              <MailIcon className="h-4 w-4" />
              Save and send
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-white p-2.5 sm:p-4">
      <p className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-muted sm:text-sm sm:normal-case sm:tracking-normal">
        {label}
      </p>
      <p className="mt-1 truncate text-base font-semibold text-ink sm:mt-2 sm:text-2xl">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "Accepted"
      ? "bg-brand-50 text-brand-700"
      : status === "Declined"
        ? "bg-danger-500/10 text-danger-600"
        : status === "Draft"
          ? "bg-mist text-muted"
          : "bg-water-500/10 text-water-600";

  return <span className={`badge ${tone}`}>{status}</span>;
}
