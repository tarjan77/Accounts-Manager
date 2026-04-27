export type PaymentStatus = "Paid" | "Unpaid";

export type PaymentMethod = "Bank Transfer" | "Cash" | "Other" | "";

export type JobStatus = "Scheduled" | "Completed";

export type ServiceType =
  | "End of Lease / Vacate"
  | "Deep Cleaning"
  | "Window Cleaning"
  | "Pressure Cleaning"
  | "Custom";

export type PropertyType = "House" | "Apartment / Unit";

export type InvoiceLineItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  addressLine1: string;
  addressLine2?: string;
  suburb: string;
  state: string;
  postcode: string;
};

export type CustomerInput = Omit<Customer, "id">;

export type Job = {
  id: string;
  customerId: string;
  customerName: string;
  serviceType?: ServiceType;
  propertyType?: PropertyType;
  bedrooms?: number;
  bathrooms?: number;
  windowPackage?: string;
  quoteRequired?: boolean;
  serviceDescription: string;
  lineItems: InvoiceLineItem[];
  price: number;
  date: string;
  time?: string;
  notes?: string;
  jobStatus: JobStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
};

export type JobInput = Omit<Job, "id">;
