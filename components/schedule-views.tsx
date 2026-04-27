"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { CheckIcon, FileIcon } from "@/components/icons";
import {
  deleteJob,
  markJobCompleted,
  markPaymentReceived
} from "@/lib/firestore";
import {
  formatCurrency,
  formatDate,
  formatTime,
  groupJobsByDate,
  toISODate
} from "@/lib/format";
import { lineItemsTotal, summarizeLineItems } from "@/lib/job-items";
import { generateInvoicePdf } from "@/lib/invoice";
import { loadInvoiceLogo } from "@/lib/logo";
import type { Customer, Job } from "@/lib/types";

export type ViewMode = "list" | "calendar";

export function ScheduleList({
  jobs,
  customers,
  loading,
  onEdit
}: {
  jobs: Job[];
  customers: Customer[];
  loading: boolean;
  onEdit: (job: Job) => void;
}) {
  const groups = groupJobsByDate(jobs);

  if (loading) {
    return <div className="card p-5 text-sm text-muted">Loading schedule...</div>;
  }

  if (!jobs.length) {
    return <div className="card p-5 text-sm text-muted">No jobs yet.</div>;
  }

  return (
    <div className="space-y-4">
      {Object.entries(groups).map(([date, dateJobs]) => (
        <section className="card overflow-hidden" key={date}>
          <div className="border-b border-line bg-white px-4 py-4 sm:px-5">
            <h3 className="text-lg font-semibold text-ink">{formatDate(date)}</h3>
          </div>
          <div className="divide-y divide-line">
            {dateJobs.map((job) => (
              <JobRow customers={customers} job={job} key={job.id} onEdit={onEdit} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function JobRow({
  job,
  customers,
  onEdit
}: {
  job: Job;
  customers: Customer[];
  onEdit: (job: Job) => void;
}) {
  const { user } = useAuth();
  const customer = customers.find((item) => item.id === job.customerId);
  const [busy, setBusy] = useState(false);
  const total = lineItemsTotal(job.lineItems);

  async function handlePaid() {
    if (!user) {
      return;
    }

    setBusy(true);
    try {
      await markPaymentReceived(user.uid, job.id, job.paymentMethod || "Bank Transfer");
    } finally {
      setBusy(false);
    }
  }

  async function handleComplete() {
    if (!user) {
      return;
    }

    setBusy(true);
    try {
      await markJobCompleted(user.uid, job.id);
    } finally {
      setBusy(false);
    }
  }

  async function handleInvoice() {
    setBusy(true);
    try {
      const logoDataUrl = await loadInvoiceLogo();
      await generateInvoicePdf({ job, customer, logoDataUrl });
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!user || !window.confirm("Delete this job?")) {
      return;
    }

    await deleteJob(user.uid, job.id);
  }

  return (
    <article className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[120px_1fr_auto] lg:items-start">
      <div>
        <p className="text-sm font-semibold text-ink">{formatTime(job.time) || "Any time"}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <span
            className={`badge ${
              job.jobStatus === "Completed"
                ? "bg-brand-50 text-brand-700"
                : "bg-water-500/10 text-water-600"
            }`}
          >
            {job.jobStatus}
          </span>
          <span
            className={`badge ${
              job.paymentStatus === "Paid"
                ? "bg-brand-50 text-brand-700"
                : "bg-amber-500/10 text-amber-500"
            }`}
          >
            {job.paymentStatus}
          </span>
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h4 className="font-semibold text-ink">{customer?.name || job.customerName}</h4>
          <span className="text-sm font-semibold text-water-600">
            {formatCurrency(total || job.price)}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted">{summarizeLineItems(job.lineItems)}</p>
        {job.lineItems.length > 1 ? (
          <p className="mt-1 text-xs font-medium text-muted">
            {job.lineItems.length} invoice items
          </p>
        ) : null}
        {job.notes ? <p className="mt-2 text-sm text-ink">{job.notes}</p> : null}
        {job.paymentMethod ? (
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            {job.paymentMethod}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:justify-end">
        {job.jobStatus !== "Completed" ? (
          <button className="btn-secondary gap-2" disabled={busy} onClick={handleComplete} type="button">
            <CheckIcon className="h-4 w-4" />
            Complete
          </button>
        ) : null}
        {job.paymentStatus === "Unpaid" ? (
          <button className="btn-secondary" disabled={busy} onClick={handlePaid} type="button">
            Paid
          </button>
        ) : null}
        <button className="btn-secondary gap-2" disabled={busy} onClick={handleInvoice} type="button">
          <FileIcon className="h-4 w-4" />
          Invoice
        </button>
        <button className="btn-secondary" onClick={() => onEdit(job)} type="button">
          Edit
        </button>
        <button className="btn-danger" onClick={handleDelete} type="button">
          Delete
        </button>
      </div>
    </article>
  );
}

export function CalendarView({
  jobs,
  customers,
  loading,
  onEdit
}: {
  jobs: Job[];
  customers: Customer[];
  loading: boolean;
  onEdit: (job: Job) => void;
}) {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const days = useMemo(() => buildCalendarDays(month), [month]);
  const jobsByDate = useMemo(() => groupJobsByDate(jobs), [jobs]);
  const monthName = new Intl.DateTimeFormat("en-AU", {
    month: "long",
    year: "numeric"
  }).format(month);

  function changeMonth(offset: number) {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  if (loading) {
    return <div className="card p-5 text-sm text-muted">Loading calendar...</div>;
  }

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-line p-5 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-semibold text-ink">{monthName}</h3>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => changeMonth(-1)} type="button">
            Previous
          </button>
          <button className="btn-secondary" onClick={() => changeMonth(1)} type="button">
            Next
          </button>
        </div>
      </div>

      <div className="hidden grid-cols-7 border-b border-line bg-mist text-xs font-semibold uppercase tracking-[0.12em] text-muted md:grid">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
          <div className="border-r border-line px-3 py-3 last:border-r-0" key={day}>
            {day}
          </div>
        ))}
      </div>

      <div className="grid gap-3 p-4 md:grid-cols-7 md:gap-0 md:p-0">
        {days.map((day) => {
          const dayJobs = jobsByDate[day.iso] || [];

          return (
            <div
              className={`min-h-36 rounded-md border border-line bg-white p-3 md:rounded-none md:border-l-0 md:border-t-0 ${
                day.inMonth ? "" : "bg-mist text-muted"
              }`}
              key={day.iso}
            >
              <p className="text-sm font-semibold">{day.label}</p>
              <div className="mt-3 space-y-2">
                {dayJobs.map((job) => {
                  const customer = customers.find((item) => item.id === job.customerId);

                  return (
                    <button
                      className="w-full rounded-md border border-line bg-mist p-2 text-left transition hover:border-brand-500 hover:bg-brand-50"
                      key={job.id}
                      onClick={() => onEdit(job)}
                      type="button"
                    >
                      <p className="truncate text-xs font-semibold text-ink">
                        {customer?.name || job.customerName}
                      </p>
                      <p className="mt-1 truncate text-xs text-muted">
                        {summarizeLineItems(job.lineItems)}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-water-600">
                          {formatCurrency(lineItemsTotal(job.lineItems))}
                        </span>
                        <span
                          className={`h-2 w-2 rounded-full ${
                            job.jobStatus === "Completed" ? "bg-brand-600" : "bg-water-500"
                          }`}
                          title={job.jobStatus}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function buildCalendarDays(month: Date) {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const startOffset = (start.getDay() + 6) % 7;
  const totalDays = Math.ceil((startOffset + end.getDate()) / 7) * 7;
  const firstVisible = new Date(start);
  firstVisible.setDate(start.getDate() - startOffset);

  return Array.from({ length: totalDays }, (_, index) => {
    const date = new Date(firstVisible);
    date.setDate(firstVisible.getDate() + index);

    return {
      iso: toISODate(date),
      label: date.getDate().toString(),
      inMonth: date.getMonth() === month.getMonth()
    };
  });
}
