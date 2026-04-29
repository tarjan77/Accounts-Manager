"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AddressFields } from "@/components/address-fields";
import { PlusIcon } from "@/components/icons";
import { createCustomer, createJob, updateJob } from "@/lib/firestore";
import { lineItemsTotal, summarizeLineItems } from "@/lib/job-items";
import { todayISO } from "@/lib/format";
import { useAuth } from "@/components/auth-provider";
import type {
  Customer,
  CustomerInput,
  InvoiceLineItem,
  Job,
  JobInput,
  JobStatus,
  PaymentMethod,
  PaymentStatus,
  PropertyType,
  ServiceType
} from "@/lib/types";

type CustomerMode = "existing" | "new";

const serviceOptions: Array<{
  type: ServiceType;
  label: string;
  description: string;
}> = [
  {
    type: "End of Lease / Vacate",
    label: "End of Lease / Vacate",
    description: "Bond-back guarantee standard"
  },
  {
    type: "Deep Cleaning",
    label: "Deep Cleaning",
    description: "Thorough top-to-bottom clean"
  },
  {
    type: "Window Cleaning",
    label: "Window Cleaning",
    description: "Internal and external glass packages"
  },
  {
    type: "Pressure Cleaning",
    label: "Pressure Cleaning",
    description: "Site visit required before final price"
  },
  {
    type: "Custom",
    label: "Custom service",
    description: "Build invoice items manually"
  }
];

const windowPackages = [
  {
    id: "internal-only",
    label: "Internal Windows Only",
    price: 100,
    details: "Internal glass cleaned"
  },
  {
    id: "internal-tracks",
    label: "Internal Windows + Tracks",
    price: 175,
    details: "Internal glass, frames, sills and tracks"
  },
  {
    id: "internal-external",
    label: "Internal + External Windows",
    price: 175,
    details: "Internal and external glass cleaned"
  },
  {
    id: "all-windows",
    label: "Internal + External + Tracks",
    price: 250,
    details: "Glass, frames, sills and tracks"
  }
];

const extras = [
  { id: "oven-cleaning", label: "Oven Cleaning", price: 100 },
  { id: "fridge-cleaning", label: "Fridge Cleaning", price: 75 },
  { id: "wall-spot-clean", label: "Wall Spot Clean (Light)", price: 75 },
  { id: "full-wall-wash", label: "Full Wall Wash (Heavy)", price: 150 },
  { id: "internal-windows-extra", label: "Internal Windows", price: 75 },
  { id: "exterior-windows-extra", label: "Exterior Windows", price: 100 }
];

const blankNewCustomer: CustomerInput = {
  name: "",
  phone: "",
  email: "",
  address: "",
  addressLine1: "",
  addressLine2: "",
  suburb: "",
  state: "WA",
  postcode: ""
};

function blankJobForm(): Omit<JobInput, "lineItems" | "price" | "serviceDescription"> {
  return {
    customerId: "",
    customerName: "",
    serviceType: "End of Lease / Vacate",
    propertyType: "House",
    bedrooms: 2,
    bathrooms: 1,
    windowPackage: "",
    quoteRequired: false,
    date: todayISO(),
    time: "",
    notes: "",
    jobStatus: "Scheduled",
    paymentStatus: "Unpaid",
    paymentMethod: ""
  };
}

function baseLineItem(description = "End of Lease / Vacate - House, 2 bedrooms, 1 bathroom") {
  return {
    id: "base-service",
    description,
    quantity: 1,
    unitPrice: 0
  };
}

function propertyDescription(
  serviceType: ServiceType,
  propertyType: PropertyType,
  bedrooms: number,
  bathrooms: number
) {
  const bedroomLabel = `${bedrooms} bedroom${bedrooms === 1 ? "" : "s"}`;
  const bathroomLabel = `${bathrooms} bathroom${bathrooms === 1 ? "" : "s"}`;
  return `${serviceType} - ${propertyType}, ${bedroomLabel}, ${bathroomLabel}`;
}

function sanitizeItems(items: InvoiceLineItem[]) {
  return items
    .filter((item) => item.description.trim())
    .map((item, index) => ({
      id: item.id || `item-${index + 1}`,
      description: item.description.trim(),
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.unitPrice) || 0
    }));
}

export function JobForm({
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
  const [form, setForm] = useState(blankJobForm);
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([
    baseLineItem()
  ]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const total = useMemo(() => lineItemsTotal(lineItems), [lineItems]);

  useEffect(() => {
    if (editing) {
      setCustomerMode("existing");
      setForm({
        customerId: editing.customerId,
        customerName: editing.customerName,
        serviceType: editing.serviceType || "Custom",
        propertyType: editing.propertyType || "House",
        bedrooms: editing.bedrooms || 2,
        bathrooms: editing.bathrooms || 1,
        windowPackage: editing.windowPackage || "",
        quoteRequired: editing.quoteRequired || false,
        date: editing.date,
        time: editing.time || "",
        notes: editing.notes || "",
        jobStatus: editing.jobStatus || "Scheduled",
        paymentStatus: editing.paymentStatus,
        paymentMethod: editing.paymentMethod || ""
      });
      setLineItems(
        editing.lineItems.length
          ? editing.lineItems
          : [baseLineItem(editing.serviceDescription)]
      );
    } else {
      setForm(blankJobForm());
      setLineItems([baseLineItem()]);
      setCustomerMode("existing");
      setNewCustomer(blankNewCustomer);
    }
    setMessage("");
  }, [editing]);

  function setServiceType(serviceType: ServiceType) {
    setForm((current) => {
      const next = {
        ...current,
        serviceType,
        quoteRequired: serviceType === "Pressure Cleaning"
      };

      if (serviceType === "Window Cleaning") {
        const selectedPackage = windowPackages[0];
        next.windowPackage = selectedPackage.id;
        setLineItems((items) => [
          {
            id: "base-service",
            description: selectedPackage.label,
            quantity: 1,
            unitPrice: selectedPackage.price
          },
          ...items.filter((item) => item.id.startsWith("extra-"))
        ]);
      } else if (serviceType === "Pressure Cleaning") {
        setLineItems((items) => [
          baseLineItem("Pressure Cleaning - site visit required"),
          ...items.filter((item) => item.id.startsWith("extra-"))
        ]);
      } else if (serviceType === "Custom") {
        setLineItems((items) =>
          items.length ? items : [baseLineItem("Custom cleaning service")]
        );
      } else {
        setLineItems((items) => [
          baseLineItem(
            propertyDescription(
              serviceType,
              current.propertyType || "House",
              current.bedrooms || 2,
              current.bathrooms || 1
            )
          ),
          ...items.filter((item) => item.id.startsWith("extra-"))
        ]);
      }

      return next;
    });
  }

  function updatePropertyDetails(next: Partial<typeof form>) {
    setForm((current) => {
      const updated = { ...current, ...next };
      setLineItems((items) =>
        items.map((item) =>
          item.id === "base-service"
            ? {
                ...item,
                description: propertyDescription(
                  updated.serviceType || "End of Lease / Vacate",
                  updated.propertyType || "House",
                  updated.bedrooms || 2,
                  updated.bathrooms || 1
                )
              }
            : item
        )
      );
      return updated;
    });
  }

  function selectWindowPackage(packageId: string) {
    const selectedPackage =
      windowPackages.find((item) => item.id === packageId) || windowPackages[0];
    setForm((current) => ({ ...current, windowPackage: packageId }));
    setLineItems((items) =>
      items.map((item) =>
        item.id === "base-service"
          ? {
              ...item,
              description: selectedPackage.label,
              unitPrice: selectedPackage.price
            }
          : item
      )
    );
  }

  function updateLineItem(id: string, update: Partial<InvoiceLineItem>) {
    setLineItems((items) =>
      items.map((item) => (item.id === id ? { ...item, ...update } : item))
    );
  }

  function addCustomItem() {
    setLineItems((items) => [
      ...items,
      {
        id: `custom-${Date.now()}`,
        description: "",
        quantity: 1,
        unitPrice: 0
      }
    ]);
  }

  function removeLineItem(id: string) {
    setLineItems((items) =>
      items.length === 1 ? items : items.filter((item) => item.id !== id)
    );
  }

  function toggleExtra(extraId: string) {
    const selectedExtra = extras.find((item) => item.id === extraId);

    if (!selectedExtra) {
      return;
    }

    setLineItems((items) => {
      const itemId = `extra-${extraId}`;

      if (items.some((item) => item.id === itemId)) {
        return items.filter((item) => item.id !== itemId);
      }

      return [
        ...items,
        {
          id: itemId,
          description: selectedExtra.label,
          quantity: 1,
          unitPrice: selectedExtra.price
        }
      ];
    });
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

      const items = sanitizeItems(lineItems);
      const input: JobInput = {
        ...form,
        customerId,
        customerName,
        lineItems: items,
        serviceDescription: summarizeLineItems(items),
        price: lineItemsTotal(items)
      };

      if (editing) {
        await updateJob(user.uid, editing.id, input);
        setMessage("Job updated.");
      } else {
        await createJob(user.uid, input);
        setMessage("Job added.");
      }

      setForm(blankJobForm());
      setLineItems([baseLineItem()]);
      setNewCustomer(blankNewCustomer);
      onDone();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save job.");
    } finally {
      setSaving(false);
    }
  }

  const selectedExtraIds = new Set(
    lineItems
      .filter((item) => item.id.startsWith("extra-"))
      .map((item) => item.id.replace("extra-", ""))
  );

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <section>
        <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-700">
          Customer
        </h4>

        {!editing ? (
          <div className="mt-3 grid grid-cols-2 rounded-md border border-line bg-white p-1">
            <button
              className={`rounded px-3 py-2 text-sm font-semibold ${
                customerMode === "existing" ? "bg-brand-600 text-white" : "text-muted"
              }`}
              onClick={() => setCustomerMode("existing")}
              type="button"
            >
              Select
            </button>
            <button
              className={`rounded px-3 py-2 text-sm font-semibold ${
                customerMode === "new" ? "bg-brand-600 text-white" : "text-muted"
              }`}
              onClick={() => setCustomerMode("new")}
              type="button"
            >
              Create
            </button>
          </div>
        ) : null}

        <div className="mt-4">
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
                <span className="field-label">
                  Email <span className="label-optional">(optional)</span>
                </span>
                <input
                  className="field"
                  onChange={(event) =>
                    setNewCustomer({ ...newCustomer, email: event.target.value })
                  }
                  type="email"
                  value={newCustomer.email}
                />
              </label>
              <div className="mt-4">
                <AddressFields value={newCustomer} onChange={setNewCustomer} />
              </div>
            </div>
          )}
        </div>
      </section>

      <section>
        <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-700">
          Service
        </h4>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {serviceOptions.map((option) => {
            const active = form.serviceType === option.type;

            return (
              <button
                className={`rounded-md border p-4 text-left transition ${
                  active
                    ? "border-brand-500 bg-brand-50 text-ink"
                    : "border-line bg-white text-muted hover:border-brand-500"
                }`}
                key={option.type}
                onClick={() => setServiceType(option.type)}
                type="button"
              >
                <span className="block font-semibold text-ink">{option.label}</span>
                <span className="mt-1 block text-sm">{option.description}</span>
              </button>
            );
          })}
        </div>

        {form.serviceType === "End of Lease / Vacate" ||
        form.serviceType === "Deep Cleaning" ? (
          <div className="mt-4 rounded-md border border-line bg-white p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <span className="field-label">Property type</span>
                <div className="mt-2 grid grid-cols-2 rounded-md border border-line bg-white p-1">
                  {(["House", "Apartment / Unit"] as PropertyType[]).map((type) => (
                    <button
                      className={`rounded px-3 py-2 text-sm font-semibold ${
                        form.propertyType === type ? "bg-brand-600 text-white" : "text-muted"
                      }`}
                      key={type}
                      onClick={() => updatePropertyDetails({ propertyType: type })}
                      type="button"
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="field-label">Bedrooms</span>
                  <input
                    className="field"
                    min="0"
                    onChange={(event) =>
                      updatePropertyDetails({ bedrooms: Number(event.target.value) })
                    }
                    type="number"
                    value={form.bedrooms || 0}
                  />
                </label>
                <label className="block">
                  <span className="field-label">Bathrooms</span>
                  <input
                    className="field"
                    min="0"
                    onChange={(event) =>
                      updatePropertyDetails({ bathrooms: Number(event.target.value) })
                    }
                    type="number"
                    value={form.bathrooms || 0}
                  />
                </label>
              </div>
            </div>
          </div>
        ) : null}

        {form.serviceType === "Window Cleaning" ? (
          <div className="mt-4 grid gap-3">
            {windowPackages.map((item) => {
              const active = form.windowPackage === item.id;

              return (
                <button
                  className={`rounded-md border p-4 text-left transition ${
                    active
                      ? "border-brand-500 bg-brand-50"
                      : "border-line bg-white hover:border-brand-500"
                  }`}
                  key={item.id}
                  onClick={() => selectWindowPackage(item.id)}
                  type="button"
                >
                  <span className="flex items-start justify-between gap-4">
                    <span>
                      <span className="block font-semibold text-ink">{item.label}</span>
                      <span className="mt-1 block text-sm text-muted">{item.details}</span>
                    </span>
                    <span className="font-semibold text-brand-700">${item.price}</span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        {form.serviceType === "Pressure Cleaning" ? (
          <div className="mt-4 rounded-md border border-brand-100 bg-brand-50 p-4 text-sm text-ink">
            Pressure cleaning is marked as a site-visit quote by default. Leave the amount at
            $0 until the final price is known, then edit the item price.
          </div>
        ) : null}
      </section>

      <section>
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-700">
            Invoice items
          </h4>
          <button className="btn-secondary min-h-9 gap-2 px-3" onClick={addCustomItem} type="button">
            <PlusIcon className="h-4 w-4" />
            Add item
          </button>
        </div>

        <div className="mt-3 space-y-3">
          {lineItems.map((item, index) => (
            <div className="rounded-md border border-line bg-white p-3" key={item.id}>
              <div className="grid gap-3 sm:grid-cols-[1fr_90px_130px_auto] sm:items-end">
                <label className="block">
                  <span className="field-label">#{index + 1} Service</span>
                  <input
                    className="field"
                    onChange={(event) =>
                      updateLineItem(item.id, { description: event.target.value })
                    }
                    required
                    value={item.description}
                  />
                </label>
                <label className="block">
                  <span className="field-label">Qty</span>
                  <input
                    className="field"
                    min="1"
                    onChange={(event) =>
                      updateLineItem(item.id, { quantity: Number(event.target.value) })
                    }
                    required
                    type="number"
                    value={item.quantity}
                  />
                </label>
                <label className="block">
                  <span className="field-label">Unit price</span>
                  <input
                    className="field"
                    min="0"
                    onChange={(event) =>
                      updateLineItem(item.id, { unitPrice: Number(event.target.value) })
                    }
                    required
                    step="0.01"
                    type="number"
                    value={item.unitPrice || ""}
                  />
                </label>
                <button
                  className="btn-quiet min-h-10 px-3"
                  onClick={() => removeLineItem(item.id)}
                  type="button"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-700">
          Extras
        </h4>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {extras.map((extra) => {
            const active = selectedExtraIds.has(extra.id);

            return (
              <button
                className={`flex items-center justify-between rounded-md border p-3 text-left text-sm font-semibold transition ${
                  active
                    ? "border-brand-500 bg-brand-50 text-ink"
                    : "border-line bg-white text-ink hover:border-brand-500"
                }`}
                key={extra.id}
                onClick={() => toggleExtra(extra.id)}
                type="button"
              >
                <span>{extra.label}</span>
                <span className="text-brand-700">+${extra.price}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
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
          <span className="field-label">
            Time <span className="label-optional">(optional)</span>
          </span>
          <input
            className="field"
            onChange={(event) => setForm({ ...form, time: event.target.value })}
            type="time"
            value={form.time || ""}
          />
        </label>
        <div>
          <span className="field-label">Job status</span>
          <div className="mt-2 grid grid-cols-2 rounded-md border border-line bg-white p-1">
            {(["Scheduled", "Completed"] as JobStatus[]).map((status) => (
              <button
                className={`rounded px-3 py-2 text-sm font-semibold ${
                  form.jobStatus === status ? "bg-brand-600 text-white" : "text-muted"
                }`}
                key={status}
                onClick={() => setForm({ ...form, jobStatus: status })}
                type="button"
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
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
      </section>

      <label className="block">
        <span className="field-label">Notes</span>
        <textarea
          className="field min-h-20 resize-y"
          onChange={(event) => setForm({ ...form, notes: event.target.value })}
          value={form.notes || ""}
        />
      </label>

      <div className="rounded-md border border-line bg-mist p-4">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium text-muted">Invoice total</span>
          <span className="text-2xl font-semibold text-ink">${total.toFixed(2)}</span>
        </div>
      </div>

      {message ? <p className="text-sm text-muted">{message}</p> : null}

      <button className="btn-primary w-full" disabled={saving} type="submit">
        {saving ? "Saving..." : editing ? "Save job" : "Add job"}
      </button>
    </form>
  );
}
