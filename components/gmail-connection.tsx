"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { MailIcon } from "@/components/icons";
import { useGmailConnection } from "@/lib/hooks";

export function GmailConnectionCard() {
  const { user } = useAuth();
  const gmail = useGmailConnection(user?.uid);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function authHeader() {
    if (!user) {
      throw new Error("Sign in first.");
    }

    return {
      Authorization: `Bearer ${await user.getIdToken()}`
    };
  }

  async function connect() {
    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/gmail/connect", {
        method: "POST",
        headers: await authHeader()
      });
      const payload = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "Could not start Gmail connection.");
      }

      window.location.href = payload.url;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not connect Gmail.");
      setBusy(false);
    }
  }

  async function disconnect() {
    if (!window.confirm("Disconnect Gmail sending?")) {
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/gmail/disconnect", {
        method: "POST",
        headers: await authHeader()
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Could not disconnect Gmail.");
      }

      setMessage("Gmail disconnected.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not disconnect Gmail.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-md bg-brand-50 text-brand-700">
            <MailIcon className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-base font-semibold text-ink">Email sending</h3>
            {gmail.data.connected ? (
              <p className="mt-1 text-sm text-muted">
                Connected as {gmail.data.email || "Gmail account"}
              </p>
            ) : null}
          </div>
        </div>

        {gmail.data.connected ? (
          <button className="btn-secondary" disabled={busy} onClick={disconnect} type="button">
            {busy ? "Working..." : "Disconnect"}
          </button>
        ) : (
          <button className="btn-primary" disabled={busy || gmail.loading} onClick={connect} type="button">
            {busy ? "Opening Google..." : "Connect Gmail"}
          </button>
        )}
      </div>

      {gmail.error ? <p className="mt-3 text-sm text-danger-600">{gmail.error}</p> : null}
      {message ? <p className="mt-3 text-sm text-muted">{message}</p> : null}
    </section>
  );
}
