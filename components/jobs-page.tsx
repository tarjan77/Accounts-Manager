"use client";

import { useMemo, useState } from "react";
import { JobForm } from "@/components/job-form";
import { CalendarIcon, CalendarIcon as ScheduleIcon, PlusIcon } from "@/components/icons";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { ScheduleList, CalendarView, type ViewMode } from "@/components/schedule-views";
import { useAuth } from "@/components/auth-provider";
import { lineItemsTotal } from "@/lib/job-items";
import { useCustomers, useJobs } from "@/lib/hooks";
import type { Job } from "@/lib/types";

export function JobsPage() {
  const { user } = useAuth();
  const customers = useCustomers(user?.uid);
  const jobs = useJobs(user?.uid);
  const [view, setView] = useState<ViewMode>("list");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Job | null>(null);
  const activeJobs = useMemo(
    () => jobs.data.filter((job) => job.jobStatus !== "Completed"),
    [jobs.data]
  );
  const completedJobs = jobs.data.length - activeJobs.length;
  const activeRevenue = activeJobs.reduce(
    (total, job) => total + lineItemsTotal(job.lineItems),
    0
  );

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
  }

  return (
    <>
      <PageHeader eyebrow="Bookings" title="Schedule">
        <button className="btn-primary gap-2" onClick={() => setFormOpen(true)} type="button">
          <PlusIcon className="h-4 w-4" />
          Add job
        </button>
      </PageHeader>

      <section className="mb-5 grid gap-3 sm:grid-cols-3">
        <MiniStat label="Active jobs" value={activeJobs.length.toString()} />
        <MiniStat label="Completed" value={completedJobs.toString()} />
        <MiniStat label="Active value" value={`$${activeRevenue.toFixed(2)}`} />
      </section>

      <section className="mb-5 flex flex-col gap-3 rounded-lg border border-line bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold text-ink">Schedule board</h3>
          <p className="mt-1 text-sm text-muted">
            Jobs are visible first. Use Add job when you need the form.
          </p>
        </div>
        <div className="grid grid-cols-2 rounded-md border border-line bg-white p-1">
          <button
            className={`inline-flex items-center justify-center gap-2 rounded px-4 py-2 text-sm font-semibold ${
              view === "list" ? "bg-brand-600 text-white" : "text-muted"
            }`}
            onClick={() => setView("list")}
            type="button"
          >
            <ScheduleIcon className="h-4 w-4" />
            List
          </button>
          <button
            className={`inline-flex items-center justify-center gap-2 rounded px-4 py-2 text-sm font-semibold ${
              view === "calendar" ? "bg-brand-600 text-white" : "text-muted"
            }`}
            onClick={() => setView("calendar")}
            type="button"
          >
            <CalendarIcon className="h-4 w-4" />
            Calendar
          </button>
        </div>
      </section>

      {view === "list" ? (
        <ScheduleList
          customers={customers.data}
          jobs={jobs.data}
          loading={jobs.loading || customers.loading}
          onEdit={(job) => setEditing(job)}
        />
      ) : (
        <CalendarView
          customers={customers.data}
          jobs={jobs.data}
          loading={jobs.loading || customers.loading}
          onEdit={(job) => setEditing(job)}
        />
      )}

      <Modal
        onClose={closeForm}
        open={formOpen || Boolean(editing)}
        title={editing ? "Edit job" : "Add job"}
      >
        <JobForm customers={customers.data} editing={editing} onDone={closeForm} />
      </Modal>

      {jobs.error || customers.error ? (
        <p className="mt-6 rounded-md border border-danger-500/30 bg-danger-500/10 p-4 text-sm text-danger-600">
          {jobs.error || customers.error}
        </p>
      ) : null}
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
