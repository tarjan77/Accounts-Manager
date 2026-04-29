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

export type CatalogItem = {
  id: string;
  type: "Service" | "Goods";
  name: string;
  description: string;
  unit: string;
  rate: number;
  taxable: boolean;
};

export type CatalogItemInput = Omit<CatalogItem, "id">;

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

export type QuoteStatus = "Draft" | "Sent" | "Accepted" | "Declined" | "Invoiced";

export type Quote = {
  id: string;
  ownerId: string;
  publicToken: string;
  quoteNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerAddress?: string;
  date: string;
  expiryDate?: string;
  lineItems: InvoiceLineItem[];
  notes: string;
  terms: string;
  status: QuoteStatus;
  total: number;
  sentAt?: string;
  respondedAt?: string;
};

export type QuoteInput = Omit<Quote, "id" | "ownerId" | "total">;

export type InvoiceStatus = "Draft" | "Sent" | "Due Today" | "Overdue" | "Paid";

export type BusinessInvoice = {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerAddress?: string;
  date: string;
  dueDate: string;
  lineItems: InvoiceLineItem[];
  notes: string;
  terms: string;
  paymentOptions: Array<"Bank Transfer" | "Stripe" | "PayPal">;
  status: InvoiceStatus;
  total: number;
  balanceDue: number;
};

export type BusinessInvoiceInput = Omit<BusinessInvoice, "id" | "total" | "balanceDue">;

export type ReceivedPayment = {
  id: string;
  date: string;
  paymentNumber: string;
  referenceNumber?: string;
  customerName: string;
  invoiceNumber?: string;
  mode: "Bank Transfer" | "Cash" | "Stripe" | "PayPal" | "Other";
  amount: number;
};

export type ReceivedPaymentInput = Omit<ReceivedPayment, "id">;
