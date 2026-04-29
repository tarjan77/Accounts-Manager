"use client";

import { useMemo, useState } from "react";
import { JobForm } from "@/components/job-form";
import { CalendarIcon, CalendarIcon as ScheduleIcon } from "@/components/icons";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { ScheduleList, CalendarView, type ViewMode } from "@/components/schedule-views";
import { useAuth } from "@/components/auth-provider";
import { useCustomers, useJobs, useQuotes } from "@/lib/hooks";
import { scheduleJobsWithAcceptedQuotes } from "@/lib/schedule";
import type { Job } from "@/lib/types";

export function JobsPage() {
  const { user } = useAuth();
  const customers = useCustomers(user?.uid);
  const jobs = useJobs(user?.uid);
  const quotes = useQuotes(user?.uid);
  const [view, setView] = useState<ViewMode>("list");
  const [editing, setEditing] = useState<Job | null>(null);
  const scheduleJobs = useMemo(
    () => scheduleJobsWithAcceptedQuotes(jobs.data, quotes.data),
    [jobs.data, quotes.data]
  );
  const activeJobs = useMemo(
    () => scheduleJobs.filter((job) => job.jobStatus !== "Completed"),
    [scheduleJobs]
  );

  function closeForm() {
    setEditing(null);
  }

  return (
    <>
      <PageHeader eyebrow="Bookings" title="Schedule" />

      <section className="mb-4 flex flex-col gap-3 rounded-lg border border-line bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold text-ink">Schedule board</h3>
          <p className="mt-1 text-sm text-muted">
            Accepted quotes appear here automatically by job date.
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
          jobs={scheduleJobs}
          loading={jobs.loading || customers.loading || quotes.loading}
          onEdit={(job) => setEditing(job)}
        />
      ) : (
        <CalendarView
          customers={customers.data}
          jobs={scheduleJobs}
          loading={jobs.loading || customers.loading || quotes.loading}
          onEdit={(job) => setEditing(job)}
        />
      )}

      <Modal
        onClose={closeForm}
        open={Boolean(editing)}
        title="Edit job"
      >
        <JobForm customers={customers.data} editing={editing} onDone={closeForm} />
      </Modal>

      {jobs.error || customers.error || quotes.error ? (
        <p className="mt-6 rounded-md border border-danger-500/30 bg-danger-500/10 p-4 text-sm text-danger-600">
          {jobs.error || customers.error || quotes.error}
        </p>
      ) : null}
    </>
  );
}
