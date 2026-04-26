"use client";

import { LogoUploader } from "@/components/logo-uploader";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/components/auth-provider";
import { formatCurrency, formatDate, formatTime, sortJobs, todayISO } from "@/lib/format";
import { useCustomers, useJobs } from "@/lib/hooks";

export function DashboardPage() {
  const { user } = useAuth();
  const customers = useCustomers(user?.uid);
  const jobs = useJobs(user?.uid);

  const paidRevenue = jobs.data
    .filter((job) => job.paymentStatus === "Paid")
    .reduce((total, job) => total + job.price, 0);
  const pendingPayments = jobs.data
    .filter((job) => job.paymentStatus === "Unpaid")
    .reduce((total, job) => total + job.price, 0);
  const upcomingJobs = sortJobs(jobs.data)
    .filter((job) => job.date >= todayISO())
    .slice(0, 6);

  return (
    <>
      <PageHeader eyebrow="Overview" title="Dashboard" />

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Total jobs" value={jobs.data.length.toString()} />
        <MetricCard label="Total revenue" value={formatCurrency(paidRevenue)} />
        <MetricCard label="Pending payments" value={formatCurrency(pendingPayments)} tone="amber" />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="card overflow-hidden">
          <div className="border-b border-line p-5">
            <h3 className="text-lg font-semibold text-ink">Upcoming jobs</h3>
            <p className="mt-1 text-sm text-muted">The next booked cleaning work by date.</p>
          </div>

          <div className="divide-y divide-line">
            {jobs.loading ? (
              <p className="p-5 text-sm text-muted">Loading jobs...</p>
            ) : upcomingJobs.length ? (
              upcomingJobs.map((job) => (
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
                    <p className="mt-1 truncate text-sm text-muted">{job.serviceDescription}</p>
                  </div>
                  <div className="flex items-center gap-3 sm:justify-end">
                    <span
                      className={`badge ${
                        job.paymentStatus === "Paid"
                          ? "bg-brand-50 text-brand-700"
                          : "bg-amber-500/10 text-amber-500"
                      }`}
                    >
                      {job.paymentStatus}
                    </span>
                    <span className="text-sm font-semibold text-ink">
                      {formatCurrency(job.price)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="p-5 text-sm text-muted">No upcoming jobs yet.</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <h3 className="text-base font-semibold text-ink">Workspace</h3>
            <dl className="mt-4 grid gap-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted">Customers</dt>
                <dd className="font-semibold text-ink">{customers.data.length}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted">Paid jobs</dt>
                <dd className="font-semibold text-ink">
                  {jobs.data.filter((job) => job.paymentStatus === "Paid").length}
                </dd>
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

      {jobs.error || customers.error ? (
        <p className="mt-6 rounded-md border border-danger-500/30 bg-danger-500/10 p-4 text-sm text-danger-600">
          {jobs.error || customers.error}
        </p>
      ) : null}
    </>
  );
}

function MetricCard({
  label,
  value,
  tone = "brand"
}: {
  label: string;
  value: string;
  tone?: "brand" | "amber";
}) {
  return (
    <div className="card p-5">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className={`mt-3 text-3xl font-semibold ${tone === "amber" ? "text-amber-500" : "text-ink"}`}>
        {value}
      </p>
    </div>
  );
}
