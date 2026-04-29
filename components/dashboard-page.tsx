"use client";

import { useMemo } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/components/auth-provider";
import { MapPinIcon, PhoneIcon } from "@/components/icons";
import { formatCurrency, formatDate, formatTime, sortJobs, todayISO } from "@/lib/format";
import { getJobContact, getJobTitle, mapsUrl } from "@/lib/job-display";
import { lineItemsTotal } from "@/lib/job-items";
import { useCustomers, useInvoices, useJobs, usePayments, useQuotes } from "@/lib/hooks";
import { scheduleJobsWithAcceptedQuotes } from "@/lib/schedule";
import type { Customer, Job } from "@/lib/types";

type PeriodRow = {
  label: string;
  sales: number;
  receipts: number;
  due: number;
};

export function DashboardPage() {
  const { user } = useAuth();
  const jobs = useJobs(user?.uid);
  const customers = useCustomers(user?.uid);
  const invoices = useInvoices(user?.uid);
  const payments = usePayments(user?.uid);
  const quotes = useQuotes(user?.uid);
  const scheduledJobs = useMemo(
    () => scheduleJobsWithAcceptedQuotes(jobs.data, quotes.data),
    [jobs.data, quotes.data]
  );
  const activeJobs = useMemo(
    () => scheduledJobs.filter((job) => job.jobStatus !== "Completed"),
    [scheduledJobs]
  );
  const paidJobRevenue = jobs.data
    .filter((job) => job.paymentStatus === "Paid")
    .reduce((total, job) => total + lineItemsTotal(job.lineItems), 0);
  const unpaidJobValue = jobs.data
    .filter((job) => job.paymentStatus === "Unpaid")
    .reduce((total, job) => total + lineItemsTotal(job.lineItems), 0);
  const invoiceReceivables = invoices.data.reduce(
    (total, invoice) => total + invoice.balanceDue,
    0
  );
  const receivedPayments = payments.data.reduce((total, payment) => total + payment.amount, 0);
  const receivables = invoices.data.length ? invoiceReceivables : unpaidJobValue;
  const receipts = payments.data.length ? receivedPayments : paidJobRevenue;
  const overdue = invoices.data
    .filter((invoice) => invoice.dueDate < todayISO() && invoice.balanceDue > 0)
    .reduce((total, invoice) => total + invoice.balanceDue, 0);
  const currentDue = Math.max(receivables - overdue, 0);
  const upcomingJobs = sortJobs(activeJobs)
    .filter((job) => job.date >= todayISO())
    .slice(0, 5);
  const customerById = useMemo(
    () => new Map(customers.data.map((customer) => [customer.id, customer])),
    [customers.data]
  );
  const periodRows = useMemo(
    () => buildPeriodRows(jobs.data, invoices.data, payments.data),
    [jobs.data, invoices.data, payments.data]
  );

  return (
    <>
      <PageHeader eyebrow="Overview" title="Dashboard" />

      <section className="grid grid-cols-4 gap-2 sm:gap-3">
        <MetricCard label="Active" value={activeJobs.length.toString()} tone="brand" />
        <MetricCard label="Quotes" value={quotes.data.length.toString()} tone="water" />
        <MetricCard label="Receipts" value={formatCurrency(receipts)} tone="green" />
        <MetricCard label="Due" value={formatCurrency(receivables)} tone="amber" />
      </section>

      <JobPanel
        action={
          <Link
            className="inline-flex min-h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-md border border-line bg-white px-2.5 text-xs font-semibold text-muted transition hover:bg-mist hover:text-ink sm:min-h-9 sm:px-3 sm:text-sm"
            href="/jobs"
          >
            <span className="sm:hidden">See all</span>
            <span className="hidden sm:inline">See all jobs</span>
          </Link>
        }
        emptyText="No upcoming jobs."
        jobs={upcomingJobs}
        customerById={customerById}
        title="Upcoming jobs"
      />

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.25fr_0.85fr]">
        <ReceivablesCard currentDue={currentDue} overdue={overdue} total={receivables} />
        <SalesDuesCard rows={periodRows} />
      </section>

      {jobs.error || customers.error || invoices.error || payments.error || quotes.error ? (
        <p className="mt-6 rounded-md border border-danger-500/30 bg-danger-500/10 p-4 text-sm text-danger-600">
          {jobs.error || customers.error || invoices.error || payments.error || quotes.error}
        </p>
      ) : null}
    </>
  );
}

function ReceivablesCard({
  total,
  currentDue,
  overdue
}: {
  total: number;
  currentDue: number;
  overdue: number;
}) {
  const currentPercent = total > 0 ? Math.max(4, (currentDue / total) * 100) : 0;
  const overduePercent = total > 0 ? Math.max(4, (overdue / total) * 100) : 0;

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-ink">Total receivables</h3>
        </div>
      </div>
      <p className="mt-4 text-sm text-muted">Total receivables {formatCurrency(total)}</p>
      <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-line">
        <div className="bg-water-500" style={{ width: `${currentPercent}%` }} />
        <div className="bg-amber-500" style={{ width: `${overduePercent}%` }} />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-line bg-mist p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-water-600">
            Current
          </p>
          <p className="mt-2 text-2xl font-semibold text-ink">{formatCurrency(currentDue)}</p>
        </div>
        <div className="rounded-md border border-line bg-mist p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-500">
            Overdue
          </p>
          <p className="mt-2 text-2xl font-semibold text-ink">{formatCurrency(overdue)}</p>
        </div>
      </div>
    </div>
  );
}

function SalesDuesCard({ rows }: { rows: PeriodRow[] }) {
  return (
    <div className="card mt-5 overflow-hidden">
      <div className="border-b border-line p-4">
        <h3 className="text-lg font-semibold text-ink">Sales, receipts, and dues</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-mist text-xs uppercase tracking-[0.12em] text-muted">
            <tr>
              <th className="px-5 py-3 font-semibold">Period</th>
              <th className="px-5 py-3 text-right font-semibold">Sales</th>
              <th className="px-5 py-3 text-right font-semibold">Receipts</th>
              <th className="px-5 py-3 text-right font-semibold">Due</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-t border-line" key={row.label}>
                <td className="px-5 py-4 font-medium text-ink">{row.label}</td>
                <td className="px-5 py-4 text-right">{formatCurrency(row.sales)}</td>
                <td className="px-5 py-4 text-right">{formatCurrency(row.receipts)}</td>
                <td className="px-5 py-4 text-right font-semibold">{formatCurrency(row.due)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function JobPanel({
  title,
  jobs,
  emptyText,
  action,
  customerById,
  completed = false
}: {
  title: string;
  jobs: Job[];
  emptyText: string;
  customerById: Map<string, Customer>;
  action?: React.ReactNode;
  completed?: boolean;
}) {
  return (
    <div className="card mt-4 overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b border-line p-4">
        <div>
          <h3 className="text-lg font-semibold text-ink">{title}</h3>
        </div>
        {action}
      </div>

      <div className="divide-y divide-line">
        {jobs.length ? (
          jobs.map((job) => {
            const customer = customerById.get(job.customerId);
            const { phone, address } = getJobContact(job, customer);
            const title = getJobTitle(job);

            return (
              <div
                className="grid gap-3 p-4 sm:grid-cols-[150px_1fr_auto] sm:items-center"
                key={job.id}
              >
                <div>
                  <p className="text-sm font-semibold text-ink">{formatDate(job.date)}</p>
                  <p className="text-sm text-muted">{formatTime(job.time) || "Any time"}</p>
                </div>
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="truncate font-semibold text-ink">
                      {customer?.name || job.customerName}
                    </p>
                    <p className="truncate text-sm font-medium text-muted">{title}</p>
                  </div>
                  <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                    {address ? <span className="truncate">{address}</span> : null}
                    {phone ? <span className="shrink-0">{phone}</span> : null}
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:justify-end">
                  {phone ? (
                    <a
                      aria-label={`Call ${customer?.name || job.customerName}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white text-muted transition hover:bg-brand-50 hover:text-brand-700"
                      href={`tel:${phone}`}
                      title="Call"
                    >
                      <PhoneIcon className="h-4 w-4" />
                    </a>
                  ) : null}
                  {address ? (
                    <a
                      aria-label={`Directions to ${address}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white text-muted transition hover:bg-brand-50 hover:text-brand-700"
                      href={mapsUrl(address)}
                      rel="noreferrer"
                      target="_blank"
                      title="Directions"
                    >
                      <MapPinIcon className="h-4 w-4" />
                    </a>
                  ) : null}
                  <span
                    className={`badge hidden sm:inline-flex ${
                      completed ? "bg-brand-50 text-brand-700" : "bg-water-500/10 text-water-600"
                    }`}
                  >
                    {completed ? "Completed" : "Active"}
                  </span>
                  <span className="text-sm font-semibold text-ink">
                    {formatCurrency(lineItemsTotal(job.lineItems))}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <p className="p-5 text-sm text-muted">{emptyText}</p>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone = "brand"
}: {
  label: string;
  value: string;
  tone?: "brand" | "amber" | "water" | "green";
}) {
  const toneClass =
    tone === "amber"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-500"
      : tone === "water"
        ? "border-water-500/30 bg-water-500/10 text-water-600"
        : tone === "green"
          ? "border-brand-500/30 bg-brand-50 text-brand-700"
          : "border-line bg-white text-ink";

  return (
    <div className={`rounded-lg border p-2.5 sm:p-3 ${toneClass}`}>
      <p className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] opacity-80">
        {label}
      </p>
      <p className="mt-1 truncate text-base font-semibold sm:text-xl">
        {value}
      </p>
    </div>
  );
}

function buildPeriodRows(
  jobs: ReturnType<typeof useJobs>["data"],
  invoices: ReturnType<typeof useInvoices>["data"],
  payments: ReturnType<typeof usePayments>["data"]
): PeriodRow[] {
  const now = new Date(`${todayISO()}T00:00:00`);
  const today = new Date(now);
  const week = new Date(now);
  week.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const month = new Date(now.getFullYear(), now.getMonth(), 1);
  const year = new Date(now.getFullYear(), 0, 1);

  const periods = [
    { label: "Today", start: today },
    { label: "This Week", start: week },
    { label: "This Month", start: month },
    { label: "This Year", start: year }
  ];

  return periods.map((period) => {
    const invoiceSales = invoices
      .filter((invoice) => isOnOrAfter(invoice.date, period.start))
      .reduce((total, invoice) => total + invoice.total, 0);
    const jobSales = jobs
      .filter((job) => isOnOrAfter(job.date, period.start))
      .reduce((total, job) => total + lineItemsTotal(job.lineItems), 0);
    const periodReceipts = payments
      .filter((payment) => isOnOrAfter(payment.date, period.start))
      .reduce((total, payment) => total + payment.amount, 0);
    const fallbackReceipts = jobs
      .filter((job) => job.paymentStatus === "Paid" && isOnOrAfter(job.date, period.start))
      .reduce((total, job) => total + lineItemsTotal(job.lineItems), 0);
    const due = invoices.length
      ? invoices
          .filter((invoice) => isOnOrAfter(invoice.date, period.start))
          .reduce((total, invoice) => total + invoice.balanceDue, 0)
      : jobs
          .filter((job) => job.paymentStatus === "Unpaid" && isOnOrAfter(job.date, period.start))
          .reduce((total, job) => total + lineItemsTotal(job.lineItems), 0);

    return {
      label: period.label,
      sales: invoices.length ? invoiceSales : jobSales,
      receipts: payments.length ? periodReceipts : fallbackReceipts,
      due
    };
  });
}

function isOnOrAfter(value: string, start: Date) {
  if (!value) {
    return false;
  }

  return new Date(`${value}T00:00:00`) >= start;
}
