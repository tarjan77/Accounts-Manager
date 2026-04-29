import type { Customer, CustomerInput } from "@/lib/types";

export const blankAddressFields = {
  addressLine1: "",
  addressLine2: "",
  suburb: "",
  state: "WA",
  postcode: ""
};

export function formatAddressLines(customer?: Partial<CustomerInput | Customer>) {
  if (!customer) {
    return [];
  }

  const structuredLines = [
    customer.addressLine1,
    customer.addressLine2,
    [customer.suburb, customer.state || "WA", customer.postcode]
      .filter(Boolean)
      .join(" ")
      .trim()
  ].filter(Boolean) as string[];

  if (structuredLines.length) {
    return structuredLines;
  }

  return customer.address ? [customer.address] : [];
}

export function formatAddress(customer?: Partial<CustomerInput | Customer>) {
  return formatAddressLines(customer).join(", ");
}

export function normalizeCustomerInput(input: CustomerInput): CustomerInput {
  const normalized = {
    ...input,
    email: input.email || "",
    addressLine1: input.addressLine1 || input.address || "",
    addressLine2: input.addressLine2 || "",
    suburb: input.suburb || "",
    state: input.state || "WA",
    postcode: input.postcode || ""
  };

  return {
    ...normalized,
    address: formatAddress(normalized)
  };
}
