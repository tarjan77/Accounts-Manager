"use client";

import { FormEvent, useEffect, useState } from "react";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { PlusIcon } from "@/components/icons";
import { useAuth } from "@/components/auth-provider";
import { createItem, deleteItem, updateItem } from "@/lib/firestore";
import { formatCurrency } from "@/lib/format";
import { useItems } from "@/lib/hooks";
import type { CatalogItem, CatalogItemInput } from "@/lib/types";

const blankItem: CatalogItemInput = {
  type: "Service",
  name: "",
  description: "",
  unit: "service",
  rate: 0,
  taxable: true
};

const defaultItems: CatalogItemInput[] = [
  {
    type: "Service",
    name: "End of Lease / Vacate Cleaning",
    description:
      "Bond-back standard clean. Includes detailed kitchen, bathrooms, laundry, living areas, bedrooms, skirting, doors, cupboards, and general internal surfaces.",
    unit: "service",
    rate: 0,
    taxable: true
  },
  {
    type: "Service",
    name: "Deep Cleaning",
    description:
      "Thorough top-to-bottom clean for kitchens, bathrooms, living areas, surfaces, cupboards, fixtures, and high-touch areas.",
    unit: "service",
    rate: 0,
    taxable: true
  },
  {
    type: "Service",
    name: "Window Cleaning - Internal + External + Tracks",
    description: "Internal and external glass cleaned, frames and sills wiped, and window tracks cleaned.",
    unit: "service",
    rate: 250,
    taxable: true
  },
  {
    type: "Service",
    name: "Pressure Cleaning",
    description: "Pressure cleaning for driveways, patios, and exterior areas. Site visit required for accurate final quote.",
    unit: "service",
    rate: 0,
    taxable: true
  },
  {
    type: "Service",
    name: "Oven Cleaning",
    description: "Oven cleaning add-on.",
    unit: "each",
    rate: 100,
    taxable: true
  },
  {
    type: "Service",
    name: "Fridge Cleaning",
    description: "Fridge cleaning add-on.",
    unit: "each",
    rate: 75,
    taxable: true
  },
  {
    type: "Service",
    name: "Wall Spot Clean (Light)",
    description: "Light wall spot cleaning add-on.",
    unit: "service",
    rate: 75,
    taxable: true
  },
  {
    type: "Service",
    name: "Full Wall Wash (Heavy)",
    description: "Heavy full wall wash add-on.",
    unit: "service",
    rate: 150,
    taxable: true
  }
];

export function ItemsPage() {
  const { user } = useAuth();
  const { data: items, loading, error } = useItems(user?.uid);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [form, setForm] = useState<CatalogItemInput>(blankItem);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (editing) {
      setForm({
        type: editing.type,
        name: editing.name,
        description: editing.description,
        unit: editing.unit,
        rate: editing.rate,
        taxable: editing.taxable
      });
      setFormOpen(true);
    } else {
      setForm(blankItem);
    }
    setMessage("");
  }, [editing]);

  function closeForm() {
    setEditing(null);
    setFormOpen(false);
    setForm(blankItem);
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
        await updateItem(user.uid, editing.id, form);
      } else {
        await createItem(user.uid, form);
      }
      closeForm();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not save item.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: CatalogItem) {
    if (!user || !window.confirm(`Delete ${item.name}?`)) {
      return;
    }

    await deleteItem(user.uid, item.id);
  }

  async function addDefaultItems() {
    if (!user) {
      return;
    }

    setSeeding(true);
    setMessage("");

    try {
      await Promise.all(defaultItems.map((item) => createItem(user.uid, item)));
      setMessage("Common cleaning items added.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not add common items.");
    } finally {
      setSeeding(false);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Services" title="Items">
        <button
          className="btn-secondary gap-2"
          disabled={seeding}
          onClick={addDefaultItems}
          type="button"
        >
          {seeding ? "Adding..." : "Add common items"}
        </button>
        <button className="btn-primary gap-2" onClick={() => setFormOpen(true)} type="button">
          <PlusIcon className="h-4 w-4" />
          New item
        </button>
      </PageHeader>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line p-5">
          <div>
            <h3 className="font-semibold text-ink">All items</h3>
            <p className="mt-1 text-sm text-muted">
              Services saved here can be reused in quotes and invoices. Descriptions print for customers.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead className="bg-mist text-xs uppercase tracking-[0.12em] text-muted">
              <tr>
                <th className="border-b border-line px-5 py-3 font-semibold">Name</th>
                <th className="border-b border-line px-5 py-3 font-semibold">Description</th>
                <th className="border-b border-line px-5 py-3 font-semibold">Rate</th>
                <th className="border-b border-line px-5 py-3 font-semibold">Unit</th>
                <th className="border-b border-line px-5 py-3 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-5 py-5 text-muted" colSpan={5}>
                    Loading items...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td className="px-5 py-5 text-danger-600" colSpan={5}>
                    {error}
                  </td>
                </tr>
              ) : items.length ? (
                items.map((item) => (
                  <tr className="border-b border-line" key={item.id}>
                    <td className="border-b border-line px-5 py-4">
                      <button
                        className="font-semibold text-brand-700"
                        onClick={() => setEditing(item)}
                        type="button"
                      >
                        {item.name}
                      </button>
                      <p className="mt-1 text-xs text-muted">{item.type}</p>
                    </td>
                    <td className="max-w-xl border-b border-line px-5 py-4 text-muted">
                      <p className="line-clamp-2">{item.description || "No description"}</p>
                    </td>
                    <td className="border-b border-line px-5 py-4 font-semibold">
                      {formatCurrency(item.rate)}
                    </td>
                    <td className="border-b border-line px-5 py-4 text-muted">{item.unit}</td>
                    <td className="border-b border-line px-5 py-4 text-right">
                      <button className="btn-quiet" onClick={() => handleDelete(item)} type="button">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-5 py-5 text-muted" colSpan={5}>
                    No items yet. Add your cleaning services here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {message ? (
        <p className="mt-5 rounded-md border border-brand-100 bg-brand-50 p-4 text-sm text-brand-700">
          {message}
        </p>
      ) : null}

      <Modal onClose={closeForm} open={formOpen} title={editing ? "Edit item" : "New item"}>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <span className="field-label">Type</span>
            <div className="mt-2 grid grid-cols-2 rounded-md border border-line bg-white p-1">
              {(["Service", "Goods"] as const).map((type) => (
                <button
                  className={`rounded px-3 py-2 text-sm font-semibold ${
                    form.type === type ? "bg-brand-600 text-white" : "text-muted"
                  }`}
                  key={type}
                  onClick={() => setForm({ ...form, type })}
                  type="button"
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="field-label">Name</span>
            <input
              className="field"
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
              value={form.name}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="field-label">Selling price</span>
              <input
                className="field"
                min="0"
                onChange={(event) => setForm({ ...form, rate: Number(event.target.value) })}
                step="0.01"
                type="number"
                value={form.rate || ""}
              />
            </label>
            <label className="block">
              <span className="field-label">Unit</span>
              <input
                className="field"
                onChange={(event) => setForm({ ...form, unit: event.target.value })}
                value={form.unit}
              />
            </label>
          </div>

          <label className="block">
            <span className="field-label">Description printed on quotes/invoices</span>
            <textarea
              className="field min-h-28 resize-y"
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              value={form.description}
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              checked={form.taxable}
              onChange={(event) => setForm({ ...form, taxable: event.target.checked })}
              type="checkbox"
            />
            Taxable
          </label>

          {message ? <p className="text-sm text-danger-600">{message}</p> : null}

          <button className="btn-primary w-full" disabled={saving} type="submit">
            {saving ? "Saving..." : "Save item"}
          </button>
        </form>
      </Modal>
    </>
  );
}
