import { formatAddress } from "@/lib/address";
import type { Customer, Job } from "@/lib/types";

export function getJobTitle(job: Job) {
  if (job.serviceType && job.serviceType !== "Custom") {
    return job.serviceType;
  }

  const firstLine = job.lineItems[0]?.description
    ?.split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  return firstLine || job.serviceDescription || "Cleaning job";
}

export function getJobContact(job: Job, customer?: Customer) {
  const phone = customer?.phone || job.customerPhone || "";
  const address = customer ? formatAddress(customer) : job.customerAddress || "";

  return { phone, address };
}

export function mapsUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
