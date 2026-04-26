"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { clearStoredLogo, getStoredLogo, saveLogoFile } from "@/lib/logo";

export function LogoUploader() {
  const [logo, setLogo] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setLogo(getStoredLogo());
  }, []);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setMessage("");
    try {
      const dataUrl = await saveLogoFile(file);
      setLogo(dataUrl);
      setMessage("Fallback logo saved for invoices on this device.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save the logo.");
    } finally {
      event.target.value = "";
    }
  }

  function handleClear() {
    clearStoredLogo();
    setLogo("");
    setMessage("Fallback logo cleared. Invoices will use the website logo.");
  }

  return (
    <section className="card p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-ink">Invoice logo</h3>
          <p className="mt-1 text-sm text-muted">
            Uses the Shree Cleaning website logo first, with this uploaded logo as a local fallback.
          </p>
        </div>

        {logo ? (
          <img
            alt="Uploaded invoice logo preview"
            className="h-12 max-w-32 object-contain"
            src={logo}
          />
        ) : null}
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <label className="btn-secondary">
          Upload logo
          <input
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={handleFileChange}
            type="file"
          />
        </label>
        {logo ? (
          <button className="btn-quiet" onClick={handleClear} type="button">
            Remove uploaded logo
          </button>
        ) : null}
      </div>

      {message ? <p className="mt-3 text-sm text-muted">{message}</p> : null}
    </section>
  );
}
