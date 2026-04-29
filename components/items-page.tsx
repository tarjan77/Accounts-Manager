"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { PencilIcon, PlusIcon, TrashIcon } from "@/components/icons";
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

const blankBatchForm = {
  type: "",
  rate: "",
  description: "",
  taxable: ""
};

export function ItemsPage() {
  const { user } = useAuth();
  const { data: items, loading, error } = useItems(user?.uid);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [form, setForm] = useState<CatalogItemInput>(blankItem);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchForm, setBatchForm] = useState(blankBatchForm);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.includes(item.id)),
    [items, selectedIds]
  );
  const allVisibleSelected = Boolean(items.length) && selectedIds.length === items.length;

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

  async function handleBatchDelete() {
    if (
      !user ||
      !selectedItems.length ||
      !window.confirm(`Delete ${selectedItems.length} selected item${selectedItems.length === 1 ? "" : "s"}?`)
    ) {
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      await Promise.all(selectedItems.map((item) => deleteItem(user.uid, item.id)));
      setSelectedIds([]);
      setMessage("Selected items deleted.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not delete selected items.");
    } finally {
      setSaving(false);
    }
  }

  async function handleBatchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user || !selectedItems.length) {
      return;
    }

    const update: Partial<CatalogItemInput> = {};
    if (batchForm.type) {
      update.type = batchForm.type as CatalogItemInput["type"];
    }
    if (batchForm.rate.trim()) {
      update.rate = Number(batchForm.rate);
    }
    if (batchForm.description.trim()) {
      update.description = batchForm.description;
    }
    if (batchForm.taxable) {
      update.taxable = batchForm.taxable === "true";
    }

    if (!Object.keys(update).length) {
      setMessage("Choose at least one field to batch edit.");
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      await Promise.all(
        selectedItems.map((item) =>
          updateItem(user.uid, item.id, {
            type: item.type,
            name: item.name,
            description: item.description,
            unit: item.unit,
            rate: item.rate,
            taxable: item.taxable,
            ...update
          })
        )
      );
      setBatchOpen(false);
      setBatchForm(blankBatchForm);
      setSelectedIds([]);
      setMessage("Selected items updated.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not update selected items.");
    } finally {
      setSaving(false);
    }
  }

  function formatDescription(kind: "bullet" | "numbered") {
    const textarea = descriptionRef.current;
    const current = form.description;
    const start = textarea?.selectionStart ?? current.length;
    const end = textarea?.selectionEnd ?? current.length;
    const selected = current.slice(start, end);
    const hasSelection = selected.length > 0;

    const formatted = hasSelection
      ? selected
          .split("\n")
          .map((line, index) => {
            const cleaned = line.replace(/^(\s*[-*]|\s*\d+\.)\s*/, "").trim();
            return kind === "bullet" ? `- ${cleaned}` : `${index + 1}. ${cleaned}`;
          })
          .join("\n")
      : `${start > 0 && current[start - 1] !== "\n" ? "\n" : ""}${
          kind === "bullet" ? "- " : "1. "
        }`;

    const next = `${current.slice(0, start)}${formatted}${current.slice(end)}`;
    setForm({ ...form, description: next });

    window.requestAnimationFrame(() => {
      descriptionRef.current?.focus();
      const cursor = start + formatted.length;
      descriptionRef.current?.setSelectionRange(cursor, cursor);
    });
  }

  return (
    <>
      <PageHeader eyebrow="Services" title="Items">
        <button className="btn-primary gap-2" onClick={() => setFormOpen(true)} type="button">
          <PlusIcon className="h-4 w-4" />
          New item
        </button>
      </PageHeader>

      <section className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold text-ink">All items</h3>
          </div>
          {selectedItems.length ? (
            <div className="flex flex-wrap gap-2">
              <button
                className="btn-secondary min-h-9 px-3"
                onClick={() => setBatchOpen(true)}
                type="button"
              >
                Batch edit ({selectedItems.length})
              </button>
              <button
                className="btn-danger min-h-9 px-3"
                disabled={saving}
                onClick={handleBatchDelete}
                type="button"
              >
                Delete selected
              </button>
            </div>
          ) : null}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead className="bg-mist text-xs uppercase tracking-[0.12em] text-muted">
              <tr>
                <th className="w-12 border-b border-line px-4 py-2.5 font-semibold">
                  <input
                    aria-label="Select all items"
                    checked={allVisibleSelected}
                    onChange={(event) =>
                      setSelectedIds(event.target.checked ? items.map((item) => item.id) : [])
                    }
                    type="checkbox"
                  />
                </th>
                <th className="border-b border-line px-4 py-2.5 font-semibold">Name</th>
                <th className="border-b border-line px-4 py-2.5 font-semibold">Description</th>
                <th className="border-b border-line px-4 py-2.5 font-semibold">Rate</th>
                <th className="border-b border-line px-4 py-2.5 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-4 text-muted" colSpan={5}>
                    Loading items...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td className="px-4 py-4 text-danger-600" colSpan={5}>
                    {error}
                  </td>
                </tr>
              ) : items.length ? (
                items.map((item) => (
                  <tr className="border-b border-line" key={item.id}>
                    <td className="border-b border-line px-4 py-3">
                      <input
                        aria-label={`Select ${item.name}`}
                        checked={selectedIds.includes(item.id)}
                        onChange={(event) =>
                          setSelectedIds((current) =>
                            event.target.checked
                              ? [...current, item.id]
                              : current.filter((id) => id !== item.id)
                          )
                        }
                        type="checkbox"
                      />
                    </td>
                    <td className="border-b border-line px-4 py-3">
                      <button
                        className="font-semibold text-brand-700"
                        onClick={() => setEditing(item)}
                        type="button"
                      >
                        {item.name}
                      </button>
                      <p className="mt-1 text-xs text-muted">{item.type}</p>
                    </td>
                    <td className="max-w-xl border-b border-line px-4 py-3 text-muted">
                      <p className="line-clamp-2">{item.description || "No description"}</p>
                    </td>
                    <td className="border-b border-line px-4 py-3 font-semibold">
                      {formatCurrency(item.rate)}
                    </td>
                    <td className="border-b border-line px-4 py-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          aria-label={`Edit ${item.name}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted transition hover:bg-brand-50 hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-100"
                          onClick={() => setEditing(item)}
                          title="Edit"
                          type="button"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          aria-label={`Delete ${item.name}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted transition hover:bg-danger-500/10 hover:text-danger-600 focus:outline-none focus:ring-2 focus:ring-danger-500/20"
                          onClick={() => handleDelete(item)}
                          title="Delete"
                          type="button"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-4 text-muted" colSpan={5}>
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
            <div className="mt-2 flex flex-wrap gap-4">
              {(["Service", "Goods"] as const).map((type) => (
                <label className="flex items-center gap-2 text-sm font-semibold text-ink" key={type}>
                  <input
                    checked={form.type === type}
                    onChange={() => setForm({ ...form, type })}
                    type="radio"
                  />
                  {type}
                </label>
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

          <div className="grid gap-4">
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
          </div>

          <label className="block">
            <span className="field-label">Description printed on quotes/invoices</span>
            <div className="mt-2 flex flex-wrap gap-2 rounded-md border border-line bg-mist p-1">
              <button
                className="rounded px-3 py-1.5 text-xs font-semibold text-muted transition hover:bg-white hover:text-ink"
                onClick={() => formatDescription("bullet")}
                type="button"
              >
                Bullets
              </button>
              <button
                className="rounded px-3 py-1.5 text-xs font-semibold text-muted transition hover:bg-white hover:text-ink"
                onClick={() => formatDescription("numbered")}
                type="button"
              >
                Numbered
              </button>
            </div>
            <textarea
              className="field min-h-32 resize-y"
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              ref={descriptionRef}
              value={form.description}
            />
          </label>

          <div>
            <span className="field-label">Tax preference</span>
            <div className="mt-2 flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm font-semibold text-ink">
                <input
                  checked={form.taxable}
                  onChange={() => setForm({ ...form, taxable: true })}
                  type="radio"
                />
                Taxable
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold text-ink">
                <input
                  checked={!form.taxable}
                  onChange={() => setForm({ ...form, taxable: false })}
                  type="radio"
                />
                Tax exempt
              </label>
            </div>
          </div>

          {message ? <p className="text-sm text-danger-600">{message}</p> : null}

          <button className="btn-primary w-full" disabled={saving} type="submit">
            {saving ? "Saving..." : "Save item"}
          </button>
        </form>
      </Modal>

      <Modal
        onClose={() => {
          setBatchOpen(false);
          setBatchForm(blankBatchForm);
        }}
        open={batchOpen}
        title="Batch edit items"
      >
        <form className="space-y-4" onSubmit={handleBatchSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="field-label">Type</span>
              <select
                className="field"
                onChange={(event) => setBatchForm({ ...batchForm, type: event.target.value })}
                value={batchForm.type}
              >
                <option value="">No change</option>
                <option value="Service">Service</option>
                <option value="Goods">Goods</option>
              </select>
            </label>
            <label className="block">
              <span className="field-label">Selling price</span>
              <input
                className="field"
                min="0"
                onChange={(event) => setBatchForm({ ...batchForm, rate: event.target.value })}
                placeholder="Leave blank for no change"
                step="0.01"
                type="number"
                value={batchForm.rate}
              />
            </label>
          </div>

          <label className="block">
            <span className="field-label">Description</span>
            <textarea
              className="field min-h-28 resize-y"
              onChange={(event) =>
                setBatchForm({ ...batchForm, description: event.target.value })
              }
              placeholder="Leave blank for no change"
              value={batchForm.description}
            />
          </label>

          <label className="block">
            <span className="field-label">Tax preference</span>
            <select
              className="field"
              onChange={(event) => setBatchForm({ ...batchForm, taxable: event.target.value })}
              value={batchForm.taxable}
            >
              <option value="">No change</option>
              <option value="true">Taxable</option>
              <option value="false">Tax exempt</option>
            </select>
          </label>

          <button className="btn-primary w-full" disabled={saving} type="submit">
            {saving ? "Saving..." : `Update ${selectedItems.length} item${selectedItems.length === 1 ? "" : "s"}`}
          </button>
        </form>
      </Modal>
    </>
  );
}
