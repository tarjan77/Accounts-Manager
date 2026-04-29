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
  todayISO,
  toISODate
} from "@/lib/format";
import { lineItemsTotal, summarizeLineItems } from "@/lib/job-items";
import { generateInvoicePdf } from "@/lib/invoice";
import { loadInvoiceLogo } from "@/lib/logo";
import { isQuoteScheduleJob } from "@/lib/schedule";
import type { Customer, Job } from "@/lib/types";

export type ViewMode = "list" | "calendar";

export function ScheduleList({
  jobs,
  customers,
  logoDataUrl,
  loading,
  onEdit
}: {
  jobs: Job[];
  customers: Customer[];
  logoDataUrl?: string;
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
              <JobRow
                customers={customers}
                job={job}
                key={job.id}
                logoDataUrl={logoDataUrl}
                onEdit={onEdit}
              />
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
  logoDataUrl,
  onEdit
}: {
  job: Job;
  customers: Customer[];
  logoDataUrl?: string;
  onEdit: (job: Job) => void;
}) {
  const { user } = useAuth();
  const customer = customers.find((item) => item.id === job.customerId);
  const [busy, setBusy] = useState(false);
  const total = lineItemsTotal(job.lineItems);
  const isQuoteJob = isQuoteScheduleJob(job);

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
      const resolvedLogo = logoDataUrl || (await loadInvoiceLogo());
      await generateInvoicePdf({ job, customer, logoDataUrl: resolvedLogo });
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
          <span className="badge bg-water-500/10 text-water-600">
            {isQuoteJob ? "Accepted quote" : job.jobStatus}
          </span>
          {!isQuoteJob ? (
            <span
              className={`badge ${
                job.paymentStatus === "Paid"
                  ? "bg-brand-50 text-brand-700"
                  : "bg-amber-500/10 text-amber-500"
              }`}
            >
              {job.paymentStatus}
            </span>
          ) : null}
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
        {isQuoteJob ? (
          <p className="col-span-2 rounded-md bg-mist px-3 py-2 text-xs font-medium text-muted">
            Send invoice from Invoices.
          </p>
        ) : null}
        {!isQuoteJob && job.jobStatus !== "Completed" ? (
          <button className="btn-secondary gap-2" disabled={busy} onClick={handleComplete} type="button">
            <CheckIcon className="h-4 w-4" />
            Complete
          </button>
        ) : null}
        {!isQuoteJob && job.paymentStatus === "Unpaid" ? (
          <button className="btn-secondary" disabled={busy} onClick={handlePaid} type="button">
            Paid
          </button>
        ) : null}
        {!isQuoteJob ? (
          <>
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
          </>
        ) : null}
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
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const days = useMemo(() => buildCalendarDays(month), [month]);
  const jobsByDate = useMemo(() => groupJobsByDate(jobs), [jobs]);
  const customerById = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer])),
    [customers]
  );
  const selectedJobs = jobsByDate[selectedDate] || [];
  const monthName = new Intl.DateTimeFormat("en-AU", {
    month: "long",
    year: "numeric"
  }).format(month);

  function changeMonth(offset: number) {
    const next = new Date(month.getFullYear(), month.getMonth() + offset, 1);
    setMonth(next);
    setSelectedDate(toISODate(next));
  }

  if (loading) {
    return <div className="card p-5 text-sm text-muted">Loading calendar...</div>;
  }

  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line p-3 sm:p-4">
        <div>
          <h3 className="text-lg font-semibold text-ink">{monthName}</h3>
          <p className="mt-0.5 text-xs text-muted">
            Tap a date to view scheduled work.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button className="btn-secondary min-h-8 px-3 py-1 text-xs sm:min-h-9 sm:text-sm" onClick={() => changeMonth(-1)} type="button">
            Prev
          </button>
          <button className="btn-secondary min-h-8 px-3 py-1 text-xs sm:min-h-9 sm:text-sm" onClick={() => changeMonth(1)} type="button">
            Next
          </button>
        </div>
      </div>

      <div className="grid gap-4 p-3 lg:grid-cols-[minmax(0,1fr)_340px] lg:p-4">
        <div className="overflow-hidden rounded-md border border-line bg-white">
          <div className="grid grid-cols-7 border-b border-line bg-mist text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-muted sm:text-xs">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <div className="border-r border-line px-1.5 py-2 last:border-r-0" key={day}>
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {days.map((day) => {
              const dayJobs = jobsByDate[day.iso] || [];
              const isSelected = selectedDate === day.iso;
              const isToday = todayISO() === day.iso;

              return (
                <button
                  aria-label={`${formatDate(day.iso)}${dayJobs.length ? `, ${dayJobs.length} jobs` : ""}`}
                  className={`relative min-h-12 border-r border-t border-line p-1.5 text-left transition last:border-r-0 sm:min-h-16 lg:min-h-[74px] ${
                    day.inMonth ? "bg-white text-ink" : "bg-mist text-muted"
                  } ${isSelected ? "bg-brand-50 ring-2 ring-inset ring-brand-600" : "hover:bg-brand-50/70"}`}
                  key={day.iso}
                  onClick={() => setSelectedDate(day.iso)}
                  type="button"
                >
                  <span
                    className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full text-xs font-semibold sm:text-sm ${
                      isToday ? "bg-brand-600 text-white" : ""
                    }`}
                  >
                    {day.label}
                  </span>
                  {dayJobs.length ? (
                    <span
                      className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-water-500 ring-2 ring-white"
                      title={`${dayJobs.length} jobs`}
                    />
                  ) : null}
                  {dayJobs.length > 1 ? (
                    <span className="absolute bottom-1.5 right-1.5 text-[10px] font-semibold text-water-600 sm:text-xs">
                      {dayJobs.length}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <aside className="rounded-md border border-line bg-mist p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="font-semibold text-ink">{formatDate(selectedDate)}</h4>
              <p className="mt-1 text-xs text-muted">
                {selectedJobs.length
                  ? `${selectedJobs.length} scheduled ${selectedJobs.length === 1 ? "job" : "jobs"}`
                  : "No jobs scheduled"}
              </p>
            </div>
            {selectedJobs.length ? (
              <span className="badge bg-white text-muted">
                {formatTime(selectedJobs[0]?.time) || "Any time"}
              </span>
            ) : null}
          </div>

          <div className="mt-3 grid gap-2 lg:max-h-[420px] lg:overflow-y-auto">
            {selectedJobs.length ? (
              selectedJobs.map((job) => {
                const customer = customerById.get(job.customerId);
                const isQuoteJob = isQuoteScheduleJob(job);

                return (
                  <button
                    className={`rounded-md border border-line bg-white p-3 text-left transition ${
                      isQuoteJob ? "" : "hover:border-brand-500 hover:bg-brand-50"
                    }`}
                    key={job.id}
                    onClick={() => {
                      if (!isQuoteJob) {
                        onEdit(job);
                      }
                    }}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">
                          {customer?.name || job.customerName}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">
                          {summarizeLineItems(job.lineItems)}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-water-600">
                        {formatCurrency(lineItemsTotal(job.lineItems))}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="badge bg-water-500/10 text-water-600">
                        {isQuoteJob ? "Accepted quote" : job.jobStatus}
                      </span>
                      <span className="text-xs text-muted">
                        {formatTime(job.time) || "Any time"}
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="rounded-md border border-dashed border-line bg-white p-4 text-sm text-muted">
                Select a date with a dot to see the cleaning work for that day.
              </div>
            )}
          </div>
        </aside>
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
