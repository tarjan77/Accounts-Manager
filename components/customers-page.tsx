"use client";

import { FormEvent, useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/components/auth-provider";
import { createCustomer, deleteCustomer, updateCustomer } from "@/lib/firestore";
import { useCustomers } from "@/lib/hooks";
import type { Customer, CustomerInput } from "@/lib/types";

const blankCustomer: CustomerInput = {
  name: "",
  phone: "",
  email: "",
  address: ""
};

export function CustomersPage() {
  const { user } = useAuth();
  const { data: customers, loading, error } = useCustomers(user?.uid);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerInput>(blankCustomer);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name,
        phone: editing.phone,
        email: editing.email || "",
        address: editing.address
      });
    } else {
      setForm(blankCustomer);
    }
  }, [editing]);

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
      setEditing(null);
      setForm(blankCustomer);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not save customer.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(customer: Customer) {
    if (!user || !window.confirm(`Delete ${customer.name}? Existing jobs will keep their saved customer name.`)) {
      return;
    }

    await deleteCustomer(user.uid, customer.id);
  }

  return (
    <>
      <PageHeader eyebrow="Customers" title="Customer management" />

      <section className="grid gap-6 xl:grid-cols-[390px_1fr]">
        <form className="card h-fit p-5" onSubmit={handleSubmit}>
          <h3 className="text-lg font-semibold text-ink">
            {editing ? "Edit customer" : "Add customer"}
          </h3>

          <div className="mt-5 space-y-4">
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

            <label className="block">
              <span className="field-label">Email optional</span>
              <input
                className="field"
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                type="email"
                value={form.email}
              />
            </label>

            <label className="block">
              <span className="field-label">Address</span>
              <textarea
                className="field min-h-24 resize-y"
                onChange={(event) => setForm({ ...form, address: event.target.value })}
                required
                value={form.address}
              />
            </label>
          </div>

          {message ? <p className="mt-4 text-sm text-muted">{message}</p> : null}

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button className="btn-primary flex-1" disabled={saving} type="submit">
              {saving ? "Saving..." : editing ? "Save changes" : "Add customer"}
            </button>
            {editing ? (
              <button
                className="btn-secondary"
                onClick={() => setEditing(null)}
                type="button"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>

        <div className="card overflow-hidden">
          <div className="border-b border-line p-5">
            <h3 className="text-lg font-semibold text-ink">Customers</h3>
            <p className="mt-1 text-sm text-muted">
              {customers.length} saved customer{customers.length === 1 ? "" : "s"}
            </p>
          </div>

          {loading ? (
            <p className="p-5 text-sm text-muted">Loading customers...</p>
          ) : error ? (
            <p className="p-5 text-sm text-danger-600">{error}</p>
          ) : customers.length ? (
            <div className="divide-y divide-line">
              {customers.map((customer) => (
                <article
                  className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-start"
                  key={customer.id}
                >
                  <div>
                    <h4 className="font-semibold text-ink">{customer.name}</h4>
                    <p className="mt-1 text-sm text-muted">{customer.phone}</p>
                    {customer.email ? (
                      <p className="mt-1 text-sm text-muted">{customer.email}</p>
                    ) : null}
                    <p className="mt-2 max-w-2xl whitespace-pre-line text-sm text-ink">
                      {customer.address}
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
            <p className="p-5 text-sm text-muted">No customers yet.</p>
          )}
        </div>
      </section>
    </>
  );
}
