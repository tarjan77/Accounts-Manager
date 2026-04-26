"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isFirebaseConfigured } from "@/lib/firebase";
import { useAuth } from "@/components/auth-provider";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, signInWithEmail, signInWithGoogle, registerWithEmail } =
    useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, router, user]);

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      if (isRegistering) {
        await registerWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setError("");
    setSubmitting(true);
    try {
      await signInWithGoogle();
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in with Google.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-lg border border-line bg-white shadow-soft md:grid-cols-[1fr_0.95fr]">
        <div className="flex min-h-[520px] flex-col justify-between bg-ink p-8 text-white sm:p-10">
          <div>
            <p className="text-sm font-semibold text-brand-100">Shree Cleaning</p>
            <h1 className="mt-4 max-w-md text-3xl font-semibold tracking-tight sm:text-4xl">
              Manage cleaning jobs, invoices, and payments in one calm workspace.
            </h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-white/74">
              Built for daily use on phone or desktop, with cloud-synced customer and booking records.
            </p>
          </div>

          <div className="grid gap-3 text-sm text-white/80 sm:grid-cols-3 md:grid-cols-1 lg:grid-cols-3">
            <div className="rounded-md border border-white/12 bg-white/7 p-3">
              Customer records
            </div>
            <div className="rounded-md border border-white/12 bg-white/7 p-3">
              Job schedule
            </div>
            <div className="rounded-md border border-white/12 bg-white/7 p-3">
              PDF invoices
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-10">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-ink">
              {isRegistering ? "Create your account" : "Sign in"}
            </h2>
            <p className="mt-2 text-sm text-muted">
              Use Google or email and password. Your records stay isolated by your Firebase user ID.
            </p>
          </div>

          {!isFirebaseConfigured ? (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-ink">
              Firebase environment variables are missing. Add the values from your Firebase web app to
              `.env.local`, then restart the app.
            </div>
          ) : null}

          <button
            className="btn-secondary w-full"
            disabled={!isFirebaseConfigured || submitting}
            onClick={handleGoogleSignIn}
            type="button"
          >
            Continue with Google
          </button>

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              or
            </span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <form className="space-y-4" onSubmit={handleEmailSubmit}>
            <label className="block">
              <span className="field-label">Email</span>
              <input
                autoComplete="email"
                className="field"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
                type="email"
                value={email}
              />
            </label>

            <label className="block">
              <span className="field-label">Password</span>
              <input
                autoComplete={isRegistering ? "new-password" : "current-password"}
                className="field"
                minLength={6}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 6 characters"
                required
                type="password"
                value={password}
              />
            </label>

            {error ? (
              <p className="rounded-md border border-danger-500/30 bg-danger-500/10 p-3 text-sm text-danger-600">
                {error}
              </p>
            ) : null}

            <button
              className="btn-primary w-full"
              disabled={!isFirebaseConfigured || submitting}
              type="submit"
            >
              {submitting ? "Working..." : isRegistering ? "Create account" : "Sign in"}
            </button>
          </form>

          <button
            className="btn-quiet mt-4 w-full"
            onClick={() => {
              setError("");
              setIsRegistering((current) => !current);
            }}
            type="button"
          >
            {isRegistering ? "I already have an account" : "Create an email account"}
          </button>
        </div>
      </section>
    </main>
  );
}
