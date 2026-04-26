export type PaymentStatus = "Paid" | "Unpaid";

export type PaymentMethod = "Bank Transfer" | "Cash" | "Other" | "";

export type Customer = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address: string;
};

export type CustomerInput = Omit<Customer, "id">;

export type Job = {
  id: string;
  customerId: string;
  customerName: string;
  serviceDescription: string;
  price: number;
  date: string;
  time?: string;
  notes?: string;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
};

export type JobInput = Omit<Job, "id">;
