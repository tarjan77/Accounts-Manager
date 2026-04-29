"use client";

import type { CustomerInput } from "@/lib/types";

export function AddressFields({
  value,
  onChange
}: {
  value: CustomerInput;
  onChange: (value: CustomerInput) => void;
}) {
  return (
    <div className="grid gap-4">
      <label className="block">
        <span className="field-label">Address line 1</span>
        <input
          className="field"
          onChange={(event) => onChange({ ...value, addressLine1: event.target.value })}
          required
          value={value.addressLine1}
        />
      </label>

      <label className="block">
        <span className="field-label">
          Address line 2 <span className="label-optional">(optional)</span>
        </span>
        <input
          className="field"
          onChange={(event) => onChange({ ...value, addressLine2: event.target.value })}
          value={value.addressLine2 || ""}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-[1fr_90px_120px]">
        <label className="block">
          <span className="field-label">Suburb</span>
          <input
            className="field"
            onChange={(event) => onChange({ ...value, suburb: event.target.value })}
            required
            value={value.suburb}
          />
        </label>
        <label className="block">
          <span className="field-label">State</span>
          <input
            className="field"
            onChange={(event) => onChange({ ...value, state: event.target.value || "WA" })}
            required
            value={value.state || "WA"}
          />
        </label>
        <label className="block">
          <span className="field-label">Postcode</span>
          <input
            className="field"
            inputMode="numeric"
            onChange={(event) => onChange({ ...value, postcode: event.target.value })}
            required
            value={value.postcode}
          />
        </label>
      </div>
    </div>
  );
}
