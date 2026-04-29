"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { JobForm } from "@/components/job-form";
import { LogoUploader } from "@/components/logo-uploader";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import {
  CalendarIcon,
  FileIcon,
  PlusIcon,
  ReceiptIcon,
  UsersIcon,
  WalletIcon
} from "@/components/icons";
import { useAuth } from "@/components/auth-provider";
import { formatCurrency, formatDate, formatTime, sortJobs, todayISO } from "@/lib/format";
import { lineItemsTotal, summarizeLineItems } from "@/lib/job-items";
import {
  useCustomers,
  useInvoices,
  useJobs,
  usePayments,
  useQuotes
} from "@/lib/hooks";
import type { Job } from "@/lib/types";

type PeriodRow = {
  label: string;
  sales: number;
  receipts: number;
  due: number;
};

export function DashboardPage() {
  const { user } = useAuth();
  const customers = useCustomers(user?.uid);
  const jobs = useJobs(user?.uid);
  const invoices = useInvoices(user?.uid);
  const payments = usePayments(user?.uid);
  const quotes = useQuotes(user?.uid);
  const [formOpen, setFormOpen] = useState(false);

  const activeJobs = useMemo(
    () => jobs.data.filter((job) => job.jobStatus !== "Completed"),
    [jobs.data]
  );
  const completedJobs = useMemo(
    () => jobs.data.filter((job) => job.jobStatus === "Completed"),
    [jobs.data]
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
  const todayJobs = sortJobs(activeJobs).filter((job) => job.date === todayISO());
  const upcomingJobs = sortJobs(activeJobs)
    .filter((job) => job.date >= todayISO())
    .slice(0, 5);
  const recentCompleted = sortJobs(completedJobs).reverse().slice(0, 4);
  const periodRows = useMemo(
    () => buildPeriodRows(jobs.data, invoices.data, payments.data),
    [jobs.data, invoices.data, payments.data]
  );

  function closeForm() {
    setFormOpen(false);
  }

  return (
    <>
      <PageHeader eyebrow="Overview" title="Dashboard">
        <button className="btn-primary gap-2" onClick={() => setFormOpen(true)} type="button">
          <PlusIcon className="h-4 w-4" />
          Add job
        </button>
        <Link className="btn-secondary gap-2" href="/jobs">
          <CalendarIcon className="h-4 w-4" />
          Schedule
        </Link>
      </PageHeader>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Active jobs" value={activeJobs.length.toString()} />
        <MetricCard label="Today" value={todayJobs.length.toString()} icon="calendar" />
        <MetricCard label="Receipts" value={formatCurrency(receipts)} />
        <MetricCard label="Amount due" value={formatCurrency(receivables)} tone="amber" />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.85fr]">
        <ReceivablesCard currentDue={currentDue} overdue={overdue} total={receivables} />
        <SalesDuesCard rows={periodRows} />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <JobPanel
            action={
              <Link className="btn-secondary min-h-9 px-3" href="/jobs">
                See all jobs
              </Link>
            }
            emptyText="No jobs scheduled for today."
            jobs={todayJobs}
            subtitle="All active jobs booked for today."
            title="Jobs today"
          />

          <JobPanel
            action={
              <Link className="btn-secondary min-h-9 px-3" href="/jobs">
                Full schedule
              </Link>
            }
            emptyText="No active upcoming jobs."
            jobs={upcomingJobs}
            subtitle="Scheduled jobs that are not completed yet."
            title="Upcoming active jobs"
          />

          <JobPanel
            completed
            emptyText="No completed jobs yet."
            jobs={recentCompleted}
            subtitle="Recently completed work for quick review."
            title="Completed jobs"
          />
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <h3 className="text-base font-semibold text-ink">Quick actions</h3>
            <div className="mt-4 grid gap-2">
              <button className="btn-primary justify-start gap-2" onClick={() => setFormOpen(true)} type="button">
                <PlusIcon className="h-4 w-4" />
                Add a job
              </button>
              <Link className="btn-secondary justify-start gap-2" href="/quotes">
                <ReceiptIcon className="h-4 w-4" />
                Create quote
              </Link>
              <Link className="btn-secondary justify-start gap-2" href="/invoices">
                <FileIcon className="h-4 w-4" />
                Create invoice
              </Link>
              <Link className="btn-secondary justify-start gap-2" href="/payments">
                <WalletIcon className="h-4 w-4" />
                Record payment
              </Link>
              <Link className="btn-secondary justify-start gap-2" href="/customers">
                <UsersIcon className="h-4 w-4" />
                Manage customers
              </Link>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-base font-semibold text-ink">Workspace</h3>
            <dl className="mt-4 grid gap-3 text-sm">
              <StatLine label="Customers" value={customers.data.length} />
              <StatLine label="Quotes" value={quotes.data.length} />
              <StatLine label="Invoices" value={invoices.data.length} />
              <StatLine label="Completed jobs" value={completedJobs.length} />
              <StatLine
                label="Unpaid jobs"
                value={jobs.data.filter((job) => job.paymentStatus === "Unpaid").length}
              />
            </dl>
          </div>

          <LogoUploader />
        </div>
      </section>

      <Modal onClose={closeForm} open={formOpen} title="Add job">
        <JobForm customers={customers.data} editing={null} onDone={closeForm} />
      </Modal>

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
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-ink">Total receivables</h3>
          <p className="mt-1 text-sm text-muted">Unpaid invoices and unpaid job value.</p>
        </div>
        <Link className="btn-secondary min-h-9 px-3" href="/invoices">
          New
        </Link>
      </div>
      <p className="mt-5 text-sm text-muted">Total receivables {formatCurrency(total)}</p>
      <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-line">
        <div className="bg-water-500" style={{ width: `${currentPercent}%` }} />
        <div className="bg-amber-500" style={{ width: `${overduePercent}%` }} />
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-md border border-line bg-mist p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-water-600">
            Current
          </p>
          <p className="mt-2 text-2xl font-semibold text-ink">{formatCurrency(currentDue)}</p>
        </div>
        <div className="rounded-md border border-line bg-mist p-4">
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
    <div className="card overflow-hidden">
      <div className="border-b border-line p-5">
        <h3 className="text-lg font-semibold text-ink">Sales, receipts, and dues</h3>
        <p className="mt-1 text-sm text-muted">A quick business pulse by period.</p>
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
  subtitle,
  jobs,
  emptyText,
  action,
  completed = false
}: {
  title: string;
  subtitle: string;
  jobs: Job[];
  emptyText: string;
  action?: React.ReactNode;
  completed?: boolean;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b border-line p-5">
        <div>
          <h3 className="text-lg font-semibold text-ink">{title}</h3>
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
        </div>
        {action}
      </div>

      <div className="divide-y divide-line">
        {jobs.length ? (
          jobs.map((job) => (
            <div
              className="grid gap-3 p-5 sm:grid-cols-[150px_1fr_auto] sm:items-center"
              key={job.id}
            >
              <div>
                <p className="text-sm font-semibold text-ink">{formatDate(job.date)}</p>
                <p className="text-sm text-muted">{formatTime(job.time) || "Any time"}</p>
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-ink">{job.customerName}</p>
                <p className="mt-1 truncate text-sm text-muted">
                  {summarizeLineItems(job.lineItems)}
                </p>
              </div>
              <div className="flex items-center gap-3 sm:justify-end">
                <span
                  className={`badge ${
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
          ))
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
  tone = "brand",
  icon
}: {
  label: string;
  value: string;
  tone?: "brand" | "amber";
  icon?: "calendar";
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted">{label}</p>
        {icon === "calendar" ? <CalendarIcon className="h-5 w-5 text-brand-600" /> : null}
      </div>
      <p
        className={`mt-3 text-3xl font-semibold ${
          tone === "amber" ? "text-amber-500" : "text-ink"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function StatLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className="font-semibold text-ink">{value}</dd>
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
