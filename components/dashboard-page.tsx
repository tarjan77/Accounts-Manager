"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { JobForm } from "@/components/job-form";
import { LogoUploader } from "@/components/logo-uploader";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { CalendarIcon, CheckIcon, PlusIcon, UsersIcon } from "@/components/icons";
import { useAuth } from "@/components/auth-provider";
import { formatCurrency, formatDate, formatTime, sortJobs, todayISO } from "@/lib/format";
import { lineItemsTotal, summarizeLineItems } from "@/lib/job-items";
import { useCustomers, useJobs } from "@/lib/hooks";
import type { Job } from "@/lib/types";

export function DashboardPage() {
  const { user } = useAuth();
  const customers = useCustomers(user?.uid);
  const jobs = useJobs(user?.uid);
  const [formOpen, setFormOpen] = useState(false);
  const activeJobs = useMemo(
    () => jobs.data.filter((job) => job.jobStatus !== "Completed"),
    [jobs.data]
  );
  const completedJobs = useMemo(
    () => jobs.data.filter((job) => job.jobStatus === "Completed"),
    [jobs.data]
  );
  const paidRevenue = jobs.data
    .filter((job) => job.paymentStatus === "Paid")
    .reduce((total, job) => total + lineItemsTotal(job.lineItems), 0);
  const pendingPayments = jobs.data
    .filter((job) => job.paymentStatus === "Unpaid")
    .reduce((total, job) => total + lineItemsTotal(job.lineItems), 0);
  const upcomingJobs = sortJobs(activeJobs)
    .filter((job) => job.date >= todayISO())
    .slice(0, 5);
  const recentCompleted = sortJobs(completedJobs).reverse().slice(0, 4);
  const todayJobs = activeJobs.filter((job) => job.date === todayISO()).length;

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
        <MetricCard label="Today" value={todayJobs.toString()} icon="calendar" />
        <MetricCard label="Revenue received" value={formatCurrency(paidRevenue)} />
        <MetricCard
          label="Pending payments"
          value={formatCurrency(pendingPayments)}
          tone="amber"
        />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <JobPanel
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
              <Link className="btn-secondary justify-start gap-2" href="/customers">
                <UsersIcon className="h-4 w-4" />
                Manage customers
              </Link>
              <Link className="btn-secondary justify-start gap-2" href="/export">
                Export bookings
              </Link>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-base font-semibold text-ink">Workspace</h3>
            <dl className="mt-4 grid gap-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted">Customers</dt>
                <dd className="font-semibold text-ink">{customers.data.length}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted">Completed jobs</dt>
                <dd className="font-semibold text-ink">{completedJobs.length}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted">Unpaid jobs</dt>
                <dd className="font-semibold text-ink">
                  {jobs.data.filter((job) => job.paymentStatus === "Unpaid").length}
                </dd>
              </div>
            </dl>
          </div>

          <LogoUploader />
        </div>
      </section>

      <Modal onClose={closeForm} open={formOpen} title="Add job">
        <JobForm customers={customers.data} editing={null} onDone={closeForm} />
      </Modal>

      {jobs.error || customers.error ? (
        <p className="mt-6 rounded-md border border-danger-500/30 bg-danger-500/10 p-4 text-sm text-danger-600">
          {jobs.error || customers.error}
        </p>
      ) : null}
    </>
  );
}

function JobPanel({
  title,
  subtitle,
  jobs,
  emptyText,
  completed = false
}: {
  title: string;
  subtitle: string;
  jobs: Job[];
  emptyText: string;
  completed?: boolean;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-line p-5">
        <h3 className="text-lg font-semibold text-ink">{title}</h3>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
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
