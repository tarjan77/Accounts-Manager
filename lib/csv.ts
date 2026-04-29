import type { Customer, Job } from "@/lib/types";
import { summarizeLineItems } from "@/lib/job-items";

function escapeCsv(value: string | number) {
  const text = String(value ?? "");

  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

export function exportJobsCsv(jobs: Job[], customers: Customer[]) {
  const customerMap = new Map(customers.map((customer) => [customer.id, customer]));
  const rows = jobs.map((job) => {
    const customer = customerMap.get(job.customerId);

    return [
      customer?.name || job.customerName,
      job.date,
      job.time || "",
      summarizeLineItems(job.lineItems),
      job.price.toFixed(2),
      job.jobStatus,
      job.paymentStatus,
      job.paymentMethod || ""
    ];
  });

  const csv = [
    [
      "Customer",
      "Date",
      "Time",
      "Service",
      "Price",
      "Job status",
      "Payment status",
      "Payment method"
    ],
    ...rows
  ]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `shree-cleaning-jobs-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
