"use client";

import { PlusIcon } from "@/components/icons";
import { formatCurrency } from "@/lib/format";
import { lineItemTotal } from "@/lib/job-items";
import type { CatalogItem, InvoiceLineItem } from "@/lib/types";

type DocumentLineItemsProps = {
  items: InvoiceLineItem[];
  catalogItems: CatalogItem[];
  onChange: (items: InvoiceLineItem[]) => void;
};

export function DocumentLineItems({
  items,
  catalogItems,
  onChange
}: DocumentLineItemsProps) {
  function updateItem(id: string, update: Partial<InvoiceLineItem>) {
    onChange(items.map((item) => (item.id === id ? { ...item, ...update } : item)));
  }

  function addItem() {
    onChange([
      ...items,
      {
        id: `item-${Date.now()}`,
        description: "",
        quantity: 1,
        unitPrice: 0
      }
    ]);
  }

  function removeItem(id: string) {
    if (items.length === 1) {
      onChange([
        {
          ...items[0],
          description: "",
          quantity: 1,
          unitPrice: 0
        }
      ]);
      return;
    }

    onChange(items.filter((item) => item.id !== id));
  }

  function selectCatalogItem(rowId: string, itemId: string) {
    const catalogItem = catalogItems.find((item) => item.id === itemId);

    if (!catalogItem) {
      return;
    }

    const description = catalogItem.description
      ? `${catalogItem.name}\n${catalogItem.description}`
      : catalogItem.name;

    updateItem(rowId, {
      description,
      quantity: 1,
      unitPrice: catalogItem.rate
    });
  }

  return (
    <section className="rounded-lg border border-line bg-white">
      <div className="border-b border-line p-4">
        <div>
          <h4 className="font-semibold text-ink">Item table</h4>
        </div>
      </div>

      <div className="divide-y divide-line">
        {items.map((item, index) => (
          <div className="grid gap-3 p-4 lg:grid-cols-[1fr_90px_120px_110px_auto] lg:items-end" key={item.id}>
            <div>
              <div className="grid gap-2 sm:grid-cols-[220px_1fr]">
                <label className="block">
                  <span className="field-label">Item</span>
                  <select
                    className="field"
                    onChange={(event) => selectCatalogItem(item.id, event.target.value)}
                    value=""
                  >
                    <option value="">Select item</option>
                    {catalogItems.map((catalogItem) => (
                      <option key={catalogItem.id} value={catalogItem.id}>
                        {catalogItem.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="field-label">#{index + 1} Item and description</span>
                  <textarea
                    className="field min-h-24 resize-y"
                    onChange={(event) =>
                      updateItem(item.id, { description: event.target.value })
                    }
                    required
                    value={item.description}
                  />
                </label>
              </div>
            </div>

            <label className="block">
              <span className="field-label">Qty</span>
              <input
                className="field"
                min="0"
                onChange={(event) =>
                  updateItem(item.id, { quantity: Number(event.target.value) })
                }
                required
                step="0.01"
                type="number"
                value={item.quantity}
              />
            </label>

            <label className="block">
              <span className="field-label">Rate</span>
              <input
                className="field"
                min="0"
                onChange={(event) =>
                  updateItem(item.id, { unitPrice: Number(event.target.value) })
                }
                required
                step="0.01"
                type="number"
                value={item.unitPrice || ""}
              />
            </label>

            <div>
              <span className="field-label">Amount</span>
              <p className="mt-2 min-h-11 rounded-md bg-mist px-3 py-3 text-sm font-semibold text-ink">
                {formatCurrency(lineItemTotal(item))}
              </p>
            </div>

            <button
              className="btn-quiet min-h-10 px-3"
              onClick={() => removeItem(item.id)}
              type="button"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <div className="border-t border-line p-4">
        <button className="btn-secondary min-h-9 gap-2 px-3" onClick={addItem} type="button">
          <PlusIcon className="h-4 w-4" />
          Add row
        </button>
      </div>
    </section>
  );
}
