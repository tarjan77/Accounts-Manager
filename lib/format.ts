import type { Job } from "@/lib/types";

export function todayISO() {
  return toISODate(new Date());
}

export function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD"
  }).format(value || 0);
}

export function formatDate(value: string) {
  if (!value) {
    return "";
  }

  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
}

export function formatTime(value?: string) {
  if (!value) {
    return "";
  }

  const [hour, minute] = value.split(":");
  const date = new Date();
  date.setHours(Number(hour), Number(minute), 0, 0);

  return new Intl.DateTimeFormat("en-AU", {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

export function sortJobs(jobs: Job[]) {
  return [...jobs].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);

    if (dateCompare !== 0) {
      return dateCompare;
    }

    return (a.time || "").localeCompare(b.time || "");
  });
}

export function groupJobsByDate(jobs: Job[]) {
  return sortJobs(jobs).reduce<Record<string, Job[]>>((groups, job) => {
    groups[job.date] = groups[job.date] || [];
    groups[job.date].push(job);
    return groups;
  }, {});
}
