"use client";

import { FormEvent, useMemo, useState } from "react";
import { CheckIcon, DownloadIcon, FileIcon } from "@/components/icons";
import { updatePublicQuoteStatus } from "@/lib/firestore";
import { cleanEmail, documentTotal } from "@/lib/documents";
import { formatCurrency, formatDate } from "@/lib/format";
import { lineItemTotal } from "@/lib/job-items";
import { generateDocumentPdf } from "@/lib/document-pdf";
import { usePublicQuote } from "@/lib/hooks";
import type { InvoiceLineItem } from "@/lib/types";

export function PublicQuotePage({ token }: { token: string }) {
  const quote = usePublicQuote(token);
  const [email, setEmail] = useState("");
  const [verified, setVerified] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const total = useMemo(
    () => (quote.data ? documentTotal(quote.data.lineItems) : 0),
    [quote.data]
  );

  function verifyEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!quote.data) {
      return;
    }

    if (cleanEmail(email) === cleanEmail(quote.data.customerEmail)) {
      setVerified(true);
      setMessage("");
    } else {
      setMessage("That email does not match this quote.");
    }
  }

  async function respond(status: "Accepted" | "Declined") {
    if (!quote.data || !verified) {
      setMessage("Please verify your email before responding.");
      return;
    }

    setBusy(true);
    try {
      await updatePublicQuoteStatus(quote.data.id, status);
      setMessage(`Quote ${status.toLowerCase()}. Thank you.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update quote.");
    } finally {
      setBusy(false);
    }
  }

  async function downloadPdf() {
    if (!quote.data || !verified) {
      setMessage("Please verify your email before downloading the quote.");
      return;
    }

    await generateDocumentPdf({
      type: "Quote",
      number: quote.data.quoteNumber,
      date: quote.data.date,
      expiryDate: quote.data.expiryDate,
      customerName: quote.data.customerName,
      customerEmail: quote.data.customerEmail,
      customerPhone: quote.data.customerPhone,
      customerAddress: quote.data.customerAddress,
      lineItems: quote.data.lineItems,
      notes: quote.data.notes,
      terms: quote.data.terms,
      status: quote.data.status
    });
  }

  if (quote.loading) {
    return (
      <main className="min-h-screen bg-mist p-6">
        <div className="mx-auto max-w-3xl rounded-lg border border-line bg-white p-6 text-sm text-muted">
          Loading quote...
        </div>
      </main>
    );
  }

  if (!quote.data) {
    return (
      <main className="min-h-screen bg-mist p-6">
        <div className="mx-auto max-w-3xl rounded-lg border border-line bg-white p-6">
          <h1 className="text-2xl font-semibold text-ink">Quote not found</h1>
          <p className="mt-2 text-sm text-muted">{quote.error || "This quote link is not available."}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-mist">
      <header className="bg-brand-700 px-5 py-8 text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-100">
              Shree Cleaning
            </p>
            <h1 className="mt-1 text-2xl font-semibold">Quote {quote.data.quoteNumber}</h1>
          </div>
          <span className="badge bg-white/14 text-white">{quote.data.status}</span>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-6 px-5 py-6 lg:grid-cols-[340px_1fr]">
        <aside className="space-y-4">
          <div className="rounded-lg border border-line bg-white p-5 shadow-soft">
            <p className="text-sm font-medium text-muted">Total</p>
            <p className="mt-2 text-3xl font-semibold text-ink">{formatCurrency(total)}</p>
            <dl className="mt-5 grid gap-3 text-sm">
              <div>
                <dt className="text-muted">Quote #</dt>
                <dd className="font-semibold text-ink">{quote.data.quoteNumber}</dd>
              </div>
              <div>
                <dt className="text-muted">Date</dt>
                <dd className="font-semibold text-ink">{formatDate(quote.data.date)}</dd>
              </div>
              <div>
                <dt className="text-muted">Status</dt>
                <dd className="font-semibold text-brand-700">{quote.data.status}</dd>
              </div>
            </dl>

            <div className="mt-5 grid gap-2">
              <button className="btn-primary gap-2" disabled={busy} onClick={() => respond("Accepted")} type="button">
                <CheckIcon className="h-4 w-4" />
                Accept
              </button>
              <button className="btn-secondary" disabled={busy} onClick={() => respond("Declined")} type="button">
                Decline
              </button>
              <button className="btn-secondary gap-2" onClick={downloadPdf} type="button">
                <DownloadIcon className="h-4 w-4" />
                Download PDF
              </button>
            </div>
          </div>

          {!verified ? (
            <form className="rounded-lg border border-line bg-white p-5" onSubmit={verifyEmail}>
              <h2 className="font-semibold text-ink">Verify your identity</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Enter the email address this quote was sent to before viewing the full details.
              </p>
              <input
                className="field"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email address"
                required
                type="email"
                value={email}
              />
              <button className="btn-primary mt-3 w-full" type="submit">
                View quote
              </button>
            </form>
          ) : null}

          {message ? (
            <p className="rounded-md border border-brand-100 bg-brand-50 p-4 text-sm text-brand-700">
              {message}
            </p>
          ) : null}
        </aside>

        <section className="rounded-lg border border-line bg-white p-4 shadow-soft sm:p-8">
          {verified ? (
            <QuotePaper quote={quote.data} />
          ) : (
            <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
              <FileIcon className="h-10 w-10 text-brand-600" />
              <h2 className="mt-4 text-xl font-semibold text-ink">Quote details are protected</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted">
                Verify the customer email to view the itemised quote, notes, and terms.
              </p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function QuotePaper({
  quote
}: {
  quote: NonNullable<ReturnType<typeof usePublicQuote>["data"]>;
}) {
  return (
    <article className="mx-auto max-w-3xl bg-white text-sm text-ink">
      <div className="flex flex-col gap-6 border-b border-line pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <img
            alt="Shree Cleaning"
            className="h-auto w-36 object-contain"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
            src="https://www.shreecleaning.com/logo.png"
          />
          <div className="mt-5 leading-6 text-muted">
            <p className="font-semibold text-ink">Shree Cleaning</p>
            <p>48A Forrest Avenue</p>
            <p>South Bunbury WA 6230</p>
            <p>Australia</p>
            <p>ABN 34984880361</p>
            <p>0452135542</p>
            <p>info@shreecleaning.com</p>
          </div>
        </div>
        <div className="text-left sm:text-right">
          <h2 className="text-4xl font-semibold tracking-tight text-ink">QUOTE</h2>
          <p className="mt-2 text-muted"># {quote.quoteNumber}</p>
          <p className="mt-4 text-muted">{formatDate(quote.date)}</p>
        </div>
      </div>

      <div className="grid gap-3 border-b border-line py-6 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Bill To</p>
          <p className="mt-2 font-semibold text-ink">{quote.customerName}</p>
          {quote.customerPhone ? <p className="text-muted">{quote.customerPhone}</p> : null}
          {quote.customerEmail ? <p className="text-muted">{quote.customerEmail}</p> : null}
          {quote.customerAddress ? (
            <p className="whitespace-pre-line text-muted">{quote.customerAddress}</p>
          ) : null}
        </div>
        <div className="sm:text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Total</p>
          <p className="mt-2 text-2xl font-semibold text-ink">
            {formatCurrency(documentTotal(quote.lineItems))}
          </p>
        </div>
      </div>

      <div className="mt-8 overflow-x-auto">
        <div className="min-w-[640px] overflow-hidden rounded-none border border-line">
          <div className="grid grid-cols-[48px_1fr_70px_90px_100px] bg-brand-700 px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-white">
            <span>#</span>
            <span>Item and Description</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Rate</span>
            <span className="text-right">Amount</span>
          </div>
          <div className="divide-y divide-line">
            {quote.lineItems.map((item, index) => (
              <QuoteLine item={item} key={item.id || index} number={index + 1} />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <div className="w-full max-w-xs bg-mist p-5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted">Total</span>
            <span className="text-xl font-semibold text-ink">
              {formatCurrency(documentTotal(quote.lineItems))}
            </span>
          </div>
        </div>
      </div>

      {quote.notes ? (
        <section className="mt-10">
          <h3 className="font-semibold text-ink">Notes</h3>
          <p className="mt-2 whitespace-pre-line leading-6 text-muted">{quote.notes}</p>
        </section>
      ) : null}

      {quote.terms ? (
        <section className="mt-8">
          <h3 className="font-semibold text-ink">Terms and Conditions</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
            {quote.terms
              .split("\n")
              .map((term) => term.trim())
              .filter(Boolean)
              .map((term) => (
                <li key={term}>{term}</li>
              ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}

function QuoteLine({ item, number }: { item: InvoiceLineItem; number: number }) {
  const lines = item.description
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <div className="grid grid-cols-[48px_1fr_70px_90px_100px] px-4 py-4 text-sm">
      <span>{number}</span>
      <span>
        <span className="font-semibold text-ink">{lines[0] || "Cleaning service"}</span>
        {lines.slice(1).map((line) => (
          <span className="mt-1 block leading-6 text-muted" key={line}>
            {line}
          </span>
        ))}
      </span>
      <span className="text-right">{item.quantity}</span>
      <span className="text-right">{formatCurrency(item.unitPrice)}</span>
      <span className="text-right font-semibold">{formatCurrency(lineItemTotal(item))}</span>
    </div>
  );
}
