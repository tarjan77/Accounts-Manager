"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AddressFields } from "@/components/address-fields";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { PlusIcon } from "@/components/icons";
import { useAuth } from "@/components/auth-provider";
import { createCustomer, deleteCustomer, updateCustomer } from "@/lib/firestore";
import { formatAddress } from "@/lib/address";
import { useCustomers } from "@/lib/hooks";
import type { Customer, CustomerInput } from "@/lib/types";

const blankCustomer: CustomerInput = {
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

type CustomerSort = "name-asc" | "name-desc" | "created-desc" | "created-asc";

export function CustomersPage() {
  const { user } = useAuth();
  const { data: customers, loading, error } = useCustomers(user?.uid);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<CustomerInput>(blankCustomer);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<CustomerSort>("name-asc");
  const filteredCustomers = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return customers;
    }

    return customers.filter((customer) =>
      [customer.name, customer.phone, customer.email || "", formatAddress(customer)]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [customers, search]);
  const sortedCustomers = useMemo(() => {
    const sorted = [...filteredCustomers];

    sorted.sort((a, b) => {
      if (sortBy === "created-desc") {
        return (b.createdAt || 0) - (a.createdAt || 0);
      }

      if (sortBy === "created-asc") {
        return (a.createdAt || 0) - (b.createdAt || 0);
      }

      const nameCompare = a.name.localeCompare(b.name, undefined, {
        numeric: true,
        sensitivity: "base"
      });

      return sortBy === "name-desc" ? -nameCompare : nameCompare;
    });

    return sorted;
  }, [filteredCustomers, sortBy]);

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name,
        phone: editing.phone,
        email: editing.email || "",
        address: editing.address || "",
        addressLine1: editing.addressLine1 || editing.address || "",
        addressLine2: editing.addressLine2 || "",
        suburb: editing.suburb || "",
        state: editing.state || "WA",
        postcode: editing.postcode || ""
      });
      setFormOpen(true);
    } else {
      setForm(blankCustomer);
    }
    setMessage("");
  }, [editing]);

  function closeForm() {
    setEditing(null);
    setFormOpen(false);
    setForm(blankCustomer);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      if (editing) {
        await updateCustomer(user.uid, editing.id, form);
        setMessage("Customer updated.");
      } else {
        await createCustomer(user.uid, form);
        setMessage("Customer added.");
      }
      closeForm();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not save customer.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(customer: Customer) {
    if (
      !user ||
      !window.confirm(
        `Delete ${customer.name}? Existing jobs will keep their saved customer name.`
      )
    ) {
      return;
    }

    await deleteCustomer(user.uid, customer.id);
  }

  return (
    <>
      <PageHeader eyebrow="Clients" title="Customer list">
        <button className="btn-primary gap-2" onClick={() => setFormOpen(true)} type="button">
          <PlusIcon className="h-4 w-4" />
          Add customer
        </button>
      </PageHeader>

      <section className="card overflow-hidden">
        <div className="grid gap-3 border-b border-line p-4 lg:grid-cols-[1fr_180px_320px] lg:items-center">
          <div>
            <h3 className="text-lg font-semibold text-ink">Customers</h3>
            <p className="mt-1 text-sm text-muted">
              Keep customer details tidy here; adding a job can also create a customer.
            </p>
          </div>
          <label className="block">
            <span className="sr-only">Sort customers</span>
            <select
              className="field mt-0"
              onChange={(event) => setSortBy(event.target.value as CustomerSort)}
              value={sortBy}
            >
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="created-desc">Newest first</option>
              <option value="created-asc">Oldest first</option>
            </select>
          </label>
          <label className="block">
            <span className="sr-only">Search customers</span>
            <input
              className="field mt-0"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, phone, address"
              value={search}
            />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-left text-[13px]">
            <thead className="bg-mist text-xs uppercase tracking-[0.12em] text-muted">
              <tr>
                <th className="w-12 border-b border-line px-3 py-2 font-semibold">#</th>
                <th className="border-b border-line px-3 py-2 font-semibold">
                  <button
                    className="inline-flex items-center gap-1 font-semibold"
                    onClick={() =>
                      setSortBy((current) => (current === "name-asc" ? "name-desc" : "name-asc"))
                    }
                    type="button"
                  >
                    Name
                    <span aria-hidden="true">{sortBy === "name-desc" ? "Z-A" : "A-Z"}</span>
                  </button>
                </th>
                <th className="border-b border-line px-3 py-2 font-semibold">Email</th>
                <th className="border-b border-line px-3 py-2 font-semibold">Phone</th>
                <th className="border-b border-line px-3 py-2 font-semibold">Address</th>
                <th className="border-b border-line px-3 py-2 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-3 py-4 text-muted" colSpan={6}>
                    Loading customers...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td className="px-3 py-4 text-danger-600" colSpan={6}>
                    {error}
                  </td>
                </tr>
              ) : sortedCustomers.length ? (
                sortedCustomers.map((customer, index) => (
                  <tr key={customer.id}>
                    <td className="border-b border-line px-3 py-2 text-muted">
                      {index + 1}
                    </td>
                    <td className="border-b border-line px-3 py-2">
                      <button
                        className="font-semibold text-brand-700"
                        onClick={() => setEditing(customer)}
                        type="button"
                      >
                        {customer.name}
                      </button>
                    </td>
                    <td className="border-b border-line px-3 py-2 text-muted">
                      {customer.email || "-"}
                    </td>
                    <td className="border-b border-line px-3 py-2">{customer.phone}</td>
                    <td className="min-w-[260px] border-b border-line px-3 py-2 text-muted">
                      {formatAddress(customer) || "No address saved"}
                    </td>
                    <td className="border-b border-line px-3 py-2">
                      <div className="flex justify-end gap-2">
                        <button
                          className="btn-secondary min-h-8 px-3 py-1.5"
                          onClick={() => setEditing(customer)}
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          className="btn-danger min-h-8 px-3 py-1.5"
                          onClick={() => handleDelete(customer)}
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-3 py-4 text-muted" colSpan={6}>
                    No matching customers.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal
        onClose={closeForm}
        open={formOpen}
        title={editing ? "Edit customer" : "Add customer"}
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="field-label">Name</span>
              <input
                className="field"
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
                value={form.name}
              />
            </label>

            <label className="block">
              <span className="field-label">Phone</span>
              <input
                className="field"
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
                required
                value={form.phone}
              />
            </label>
          </div>

          <label className="block">
            <span className="field-label">
              Email <span className="label-optional">(optional)</span>
            </span>
            <input
              className="field"
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              type="email"
              value={form.email}
            />
          </label>

          <AddressFields value={form} onChange={setForm} />

          {message ? <p className="text-sm text-muted">{message}</p> : null}

          <button className="btn-primary w-full" disabled={saving} type="submit">
            {saving ? "Saving..." : editing ? "Save customer" : "Add customer"}
          </button>
        </form>
      </Modal>
    </>
  );
}
