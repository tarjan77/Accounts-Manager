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

export function CustomersPage() {
  const { user } = useAuth();
  const { data: customers, loading, error } = useCustomers(user?.uid);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<CustomerInput>(blankCustomer);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
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

      <section className="mb-5 grid gap-3 sm:grid-cols-3">
        <MiniStat label="Saved customers" value={customers.length.toString()} />
        <MiniStat
          label="With email"
          value={customers.filter((customer) => customer.email).length.toString()}
        />
        <MiniStat label="Default state" value="WA" />
      </section>

      <section className="card overflow-hidden">
        <div className="grid gap-4 border-b border-line p-5 md:grid-cols-[1fr_320px] md:items-center">
          <div>
            <h3 className="text-lg font-semibold text-ink">Customers</h3>
            <p className="mt-1 text-sm text-muted">
              Keep customer details tidy here; adding a job can also create a customer.
            </p>
          </div>
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

        {loading ? (
          <p className="p-5 text-sm text-muted">Loading customers...</p>
        ) : error ? (
          <p className="p-5 text-sm text-danger-600">{error}</p>
        ) : filteredCustomers.length ? (
          <div className="divide-y divide-line">
            {filteredCustomers.map((customer) => (
              <article
                className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-start"
                key={customer.id}
              >
                <div>
                  <h4 className="font-semibold text-ink">{customer.name}</h4>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                    <span>{customer.phone}</span>
                    {customer.email ? <span>{customer.email}</span> : null}
                  </div>
                  <p className="mt-3 max-w-2xl text-sm text-ink">
                    {formatAddress(customer) || "No address saved"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="btn-secondary"
                    onClick={() => setEditing(customer)}
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    className="btn-danger"
                    onClick={() => handleDelete(customer)}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="p-5 text-sm text-muted">No matching customers.</p>
        )}
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
            <span className="field-label">Email optional</span>
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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}
