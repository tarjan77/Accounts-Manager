"use client";

import { FormEvent, useEffect, useState } from "react";
import { AddressFields } from "@/components/address-fields";
import { useAuth } from "@/components/auth-provider";
import { Modal } from "@/components/modal";
import { normalizeCustomerInput } from "@/lib/address";
import { createCustomer } from "@/lib/firestore";
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

export function QuickCustomerModal({
  open,
  onClose,
  onCreated
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (customer: Customer) => void;
}) {
  const { user } = useAuth();
  const [form, setForm] = useState<CustomerInput>(blankCustomer);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (open) {
      setForm(blankCustomer);
      setMessage("");
    }
  }, [open]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const normalized = normalizeCustomerInput(form);
      const id = await createCustomer(user.uid, normalized);
      onCreated({ id, ...normalized });
      onClose();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not add customer.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal onClose={onClose} open={open} title="Add customer">
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
            value={form.email || ""}
          />
        </label>

        <AddressFields onChange={setForm} value={form} />

        {message ? <p className="text-sm text-danger-600">{message}</p> : null}

        <button className="btn-primary w-full" disabled={saving} type="submit">
          {saving ? "Saving..." : "Add customer"}
        </button>
      </form>
    </Modal>
  );
}
