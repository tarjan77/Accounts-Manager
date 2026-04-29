import type { Job, Quote } from "@/lib/types";

export function quoteToScheduledJob(quote: Quote): Job {
  return {
    id: `quote:${quote.id}`,
    customerId: quote.customerId,
    customerName: quote.customerName,
    serviceDescription: quote.lineItems[0]?.description || "Accepted quote",
    lineItems: quote.lineItems,
    price: quote.total,
    date: quote.jobDate || quote.date,
    time: quote.jobTime || "",
    notes: `Accepted quote ${quote.quoteNumber}`,
    jobStatus: "Scheduled",
    paymentStatus: "Unpaid",
    paymentMethod: ""
  };
}

export function scheduleJobsWithAcceptedQuotes(jobs: Job[], quotes: Quote[]) {
  const acceptedQuoteJobs = quotes
    .filter((quote) => quote.status === "Accepted")
    .map(quoteToScheduledJob);

  return [...jobs, ...acceptedQuoteJobs];
}

export function isQuoteScheduleJob(job: Job) {
  return job.id.startsWith("quote:");
}
