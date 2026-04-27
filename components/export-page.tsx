"use client";

import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/components/auth-provider";
import { exportJobsCsv } from "@/lib/csv";
import { formatCurrency } from "@/lib/format";
import { useCustomers, useJobs } from "@/lib/hooks";
import { lineItemsTotal } from "@/lib/job-items";

export function ExportPage() {
  const { user } = useAuth();
  const customers = useCustomers(user?.uid);
  const jobs = useJobs(user?.uid);
  const paidTotal = jobs.data
    .filter((job) => job.paymentStatus === "Paid")
    .reduce((total, job) => total + lineItemsTotal(job.lineItems), 0);
  const unpaidTotal = jobs.data
    .filter((job) => job.paymentStatus === "Unpaid")
    .reduce((total, job) => total + lineItemsTotal(job.lineItems), 0);

  return (
    <>
      <PageHeader eyebrow="Export" title="Booking data" />

      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="card p-5">
          <h3 className="text-lg font-semibold text-ink">CSV export</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Download all jobs with customer, date, time, service, price, job status, payment status, and payment method.
          </p>
          <button
            className="btn-primary mt-5"
            disabled={jobs.loading || customers.loading || !jobs.data.length}
            onClick={() => exportJobsCsv(jobs.data, customers.data)}
            type="button"
          >
            Download CSV
          </button>

          {!jobs.data.length && !jobs.loading ? (
            <p className="mt-4 text-sm text-muted">Add a job before exporting.</p>
          ) : null}

          {jobs.error || customers.error ? (
            <p className="mt-4 rounded-md border border-danger-500/30 bg-danger-500/10 p-3 text-sm text-danger-600">
              {jobs.error || customers.error}
            </p>
          ) : null}
        </div>

        <div className="card p-5">
          <h3 className="text-lg font-semibold text-ink">Snapshot</h3>
          <dl className="mt-5 space-y-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Jobs</dt>
              <dd className="font-semibold text-ink">{jobs.data.length}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Customers</dt>
              <dd className="font-semibold text-ink">{customers.data.length}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Paid revenue</dt>
              <dd className="font-semibold text-ink">{formatCurrency(paidTotal)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Pending payments</dt>
              <dd className="font-semibold text-ink">{formatCurrency(unpaidTotal)}</dd>
            </div>
          </dl>
        </div>
      </section>
    </>
  );
}
