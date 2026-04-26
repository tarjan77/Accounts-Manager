"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/components/auth-provider";
import {
  createCustomer,
  createJob,
  deleteJob,
  markPaymentReceived,
  updateJob
} from "@/lib/firestore";
import {
  formatCurrency,
  formatDate,
  formatTime,
  groupJobsByDate,
  toISODate,
  todayISO
} from "@/lib/format";
import { useCustomers, useJobs } from "@/lib/hooks";
import { generateInvoicePdf } from "@/lib/invoice";
import { loadInvoiceLogo } from "@/lib/logo";
import type { Customer, CustomerInput, Job, JobInput, PaymentMethod, PaymentStatus } from "@/lib/types";

type ViewMode = "list" | "calendar";
type CustomerMode = "existing" | "new";

const blankNewCustomer: CustomerInput = {
  name: "",
  phone: "",
  email: "",
  address: ""
};

function blankJobForm(): JobInput {
  return {
    customerId: "",
    customerName: "",
    serviceDescription: "",
    price: 0,
    date: todayISO(),
    time: "",
    notes: "",
    paymentStatus: "Unpaid",
    paymentMethod: ""
  };
}

export function JobsPage() {
  const { user } = useAuth();
  const customers = useCustomers(user?.uid);
  const jobs = useJobs(user?.uid);
  const [view, setView] = useState<ViewMode>("list");
  const [editing, setEditing] = useState<Job | null>(null);

  return (
    <>
      <PageHeader eyebrow="Bookings" title="Jobs and schedule">
        <div className="grid grid-cols-2 rounded-md border border-line bg-white p-1">
          <button
            className={`rounded px-4 py-2 text-sm font-semibold ${
              view === "list" ? "bg-brand-600 text-white" : "text-muted"
            }`}
            onClick={() => setView("list")}
            type="button"
          >
            List
          </button>
          <button
            className={`rounded px-4 py-2 text-sm font-semibold ${
              view === "calendar" ? "bg-brand-600 text-white" : "text-muted"
            }`}
            onClick={() => setView("calendar")}
            type="button"
          >
            Calendar
          </button>
        </div>
      </PageHeader>

      <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <JobForm
          customers={customers.data}
          editing={editing}
          onDone={() => setEditing(null)}
        />

        {view === "list" ? (
          <JobList
            customers={customers.data}
            jobs={jobs.data}
            loading={jobs.loading || customers.loading}
            onEdit={setEditing}
          />
        ) : (
          <CalendarView
            customers={customers.data}
            jobs={jobs.data}
            loading={jobs.loading || customers.loading}
            onEdit={setEditing}
          />
        )}
      </section>

      {jobs.error || customers.error ? (
        <p className="mt-6 rounded-md border border-danger-500/30 bg-danger-500/10 p-4 text-sm text-danger-600">
          {jobs.error || customers.error}
        </p>
      ) : null}
    </>
  );
}

function JobForm({
  customers,
  editing,
  onDone
}: {
  customers: Customer[];
  editing: Job | null;
  onDone: () => void;
}) {
  const { user } = useAuth();
  const [customerMode, setCustomerMode] = useState<CustomerMode>("existing");
  const [newCustomer, setNewCustomer] = useState<CustomerInput>(blankNewCustomer);
  const [form, setForm] = useState<JobInput>(blankJobForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (editing) {
      setCustomerMode("existing");
      setForm({
        customerId: editing.customerId,
        customerName: editing.customerName,
        serviceDescription: editing.serviceDescription,
        price: editing.price,
        date: editing.date,
        time: editing.time || "",
        notes: editing.notes || "",
        paymentStatus: editing.paymentStatus,
        paymentMethod: editing.paymentMethod || ""
      });
    } else {
      setForm(blankJobForm());
      setCustomerMode("existing");
      setNewCustomer(blankNewCustomer);
    }
  }, [editing]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      let customerId = form.customerId;
      let customerName = form.customerName;

      if (!editing && customerMode === "new") {
        customerId = await createCustomer(user.uid, newCustomer);
        customerName = newCustomer.name;
      } else {
        const selectedCustomer = customers.find((customer) => customer.id === form.customerId);
        customerName = selectedCustomer?.name || form.customerName;
      }

      const input: JobInput = {
        ...form,
        customerId,
        customerName,
        price: Number(form.price) || 0
      };

      if (editing) {
        await updateJob(user.uid, editing.id, input);
        setMessage("Job updated.");
      } else {
        await createJob(user.uid, input);
        setMessage("Job added.");
      }

      setForm(blankJobForm());
      setNewCustomer(blankNewCustomer);
      onDone();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save job.");
    } finally {
      setSaving(false);
    }
  }

  function setPaymentStatus(paymentStatus: PaymentStatus) {
    setForm((current) => ({
      ...current,
      paymentStatus,
      paymentMethod:
        paymentStatus === "Paid" && !current.paymentMethod
          ? "Bank Transfer"
          : current.paymentMethod
    }));
  }

  return (
    <form className="card h-fit p-5" onSubmit={handleSubmit}>
      <h3 className="text-lg font-semibold text-ink">{editing ? "Edit job" : "Add job"}</h3>

      {!editing ? (
        <div className="mt-5 grid grid-cols-2 rounded-md border border-line bg-white p-1">
          <button
            className={`rounded px-3 py-2 text-sm font-semibold ${
              customerMode === "existing" ? "bg-brand-600 text-white" : "text-muted"
            }`}
            onClick={() => setCustomerMode("existing")}
            type="button"
          >
            Select customer
          </button>
          <button
            className={`rounded px-3 py-2 text-sm font-semibold ${
              customerMode === "new" ? "bg-brand-600 text-white" : "text-muted"
            }`}
            onClick={() => setCustomerMode("new")}
            type="button"
          >
            Create customer
          </button>
        </div>
      ) : null}

      <div className="mt-5 space-y-4">
        {customerMode === "existing" ? (
          <label className="block">
            <span className="field-label">Customer</span>
            <select
              className="field"
              onChange={(event) =>
                setForm({
                  ...form,
                  customerId: event.target.value,
                  customerName:
                    customers.find((customer) => customer.id === event.target.value)?.name || ""
                })
              }
              required
              value={form.customerId}
            >
              <option value="">Choose customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="rounded-md border border-line bg-mist p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="field-label">Name</span>
                <input
                  className="field"
                  onChange={(event) =>
                    setNewCustomer({ ...newCustomer, name: event.target.value })
                  }
                  required
                  value={newCustomer.name}
                />
              </label>
              <label className="block">
                <span className="field-label">Phone</span>
                <input
                  className="field"
                  onChange={(event) =>
                    setNewCustomer({ ...newCustomer, phone: event.target.value })
                  }
                  required
                  value={newCustomer.phone}
                />
              </label>
            </div>
            <label className="mt-4 block">
              <span className="field-label">Email optional</span>
              <input
                className="field"
                onChange={(event) =>
                  setNewCustomer({ ...newCustomer, email: event.target.value })
                }
                type="email"
                value={newCustomer.email}
              />
            </label>
            <label className="mt-4 block">
              <span className="field-label">Address</span>
              <textarea
                className="field min-h-20 resize-y"
                onChange={(event) =>
                  setNewCustomer({ ...newCustomer, address: event.target.value })
                }
                required
                value={newCustomer.address}
              />
            </label>
          </div>
        )}

        <label className="block">
          <span className="field-label">Service description</span>
          <textarea
            className="field min-h-24 resize-y"
            onChange={(event) =>
              setForm({ ...form, serviceDescription: event.target.value })
            }
            required
            value={form.serviceDescription}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="field-label">Price</span>
            <input
              className="field"
              min="0"
              onChange={(event) => setForm({ ...form, price: Number(event.target.value) })}
              required
              step="0.01"
              type="number"
              value={form.price || ""}
            />
          </label>
          <label className="block">
            <span className="field-label">Date</span>
            <input
              className="field"
              onChange={(event) => setForm({ ...form, date: event.target.value })}
              required
              type="date"
              value={form.date}
            />
          </label>
          <label className="block">
            <span className="field-label">Time optional</span>
            <input
              className="field"
              onChange={(event) => setForm({ ...form, time: event.target.value })}
              type="time"
              value={form.time || ""}
            />
          </label>
        </div>

        <label className="block">
          <span className="field-label">Notes</span>
          <textarea
            className="field min-h-20 resize-y"
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
            value={form.notes || ""}
          />
        </label>

        <div>
          <span className="field-label">Payment status</span>
          <div className="mt-2 grid grid-cols-2 rounded-md border border-line bg-white p-1">
            {(["Unpaid", "Paid"] as PaymentStatus[]).map((status) => (
              <button
                className={`rounded px-3 py-2 text-sm font-semibold ${
                  form.paymentStatus === status
                    ? status === "Paid"
                      ? "bg-brand-600 text-white"
                      : "bg-amber-500 text-white"
                    : "text-muted"
                }`}
                key={status}
                onClick={() => setPaymentStatus(status)}
                type="button"
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="field-label">Payment method</span>
          <select
            className="field"
            onChange={(event) =>
              setForm({ ...form, paymentMethod: event.target.value as PaymentMethod })
            }
            value={form.paymentMethod}
          >
            <option value="">Not set</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Cash">Cash</option>
            <option value="Other">Other</option>
          </select>
        </label>
      </div>

      {message ? <p className="mt-4 text-sm text-muted">{message}</p> : null}

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <button className="btn-primary flex-1" disabled={saving} type="submit">
          {saving ? "Saving..." : editing ? "Save changes" : "Add job"}
        </button>
        {editing ? (
          <button className="btn-secondary" onClick={onDone} type="button">
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}

function JobList({
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
    <div className="space-y-5">
      {Object.entries(groups).map(([date, dateJobs]) => (
        <section className="card overflow-hidden" key={date}>
          <div className="border-b border-line bg-white p-5">
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
    <article className="grid gap-4 p-5 lg:grid-cols-[110px_1fr_auto] lg:items-start">
      <div>
        <p className="text-sm font-semibold text-ink">{formatTime(job.time) || "Any time"}</p>
        <span
          className={`badge mt-2 ${
            job.paymentStatus === "Paid"
              ? "bg-brand-50 text-brand-700"
              : "bg-amber-500/10 text-amber-500"
          }`}
        >
          {job.paymentStatus}
        </span>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h4 className="font-semibold text-ink">{customer?.name || job.customerName}</h4>
          <span className="text-sm font-semibold text-water-600">{formatCurrency(job.price)}</span>
        </div>
        <p className="mt-1 text-sm text-muted">{job.serviceDescription}</p>
        {job.notes ? <p className="mt-2 text-sm text-ink">{job.notes}</p> : null}
        {job.paymentMethod ? (
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            {job.paymentMethod}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2 lg:justify-end">
        {job.paymentStatus === "Unpaid" ? (
          <button className="btn-secondary" disabled={busy} onClick={handlePaid} type="button">
            Payment received
          </button>
        ) : null}
        <button className="btn-secondary" disabled={busy} onClick={handleInvoice} type="button">
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

function CalendarView({
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
                        {job.serviceDescription}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-water-600">
                          {formatCurrency(job.price)}
                        </span>
                        <span
                          className={`h-2 w-2 rounded-full ${
                            job.paymentStatus === "Paid" ? "bg-brand-600" : "bg-amber-500"
                          }`}
                          title={job.paymentStatus}
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
