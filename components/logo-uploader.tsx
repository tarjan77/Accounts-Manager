"use client";

import { ChangeEvent, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { removeBusinessLogo, updateBusinessLogo } from "@/lib/firestore";
import { useBusinessSettings } from "@/lib/hooks";
import { fileToDataUrl } from "@/lib/logo";

export function LogoUploader() {
  const { user } = useAuth();
  const settings = useBusinessSettings(user?.uid);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const logo = settings.data.logoDataUrl || "";

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file || !user) {
      return;
    }

    setMessage("");
    setBusy(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      await updateBusinessLogo(user.uid, dataUrl);
      setMessage("Logo saved to this account. It will sync across devices.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save the logo.");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  async function handleClear() {
    if (!user) {
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      await removeBusinessLogo(user.uid);
      setMessage("Uploaded account logo removed. PDFs will use the website logo.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not remove the logo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-ink">Quote and invoice logo</h3>
          <p className="mt-1 text-sm text-muted">
            Upload once here and it stays saved to your account. Quotes and invoices use it automatically.
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
          {busy ? "Saving..." : logo ? "Change logo" : "Upload logo"}
          <input
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            disabled={busy}
            onChange={handleFileChange}
            type="file"
          />
        </label>
        {logo ? (
          <button className="btn-quiet" disabled={busy} onClick={handleClear} type="button">
            Remove uploaded logo
          </button>
        ) : null}
      </div>

      {settings.error ? <p className="mt-3 text-sm text-danger-600">{settings.error}</p> : null}
      {message ? <p className="mt-3 text-sm text-muted">{message}</p> : null}
    </section>
  );
}
