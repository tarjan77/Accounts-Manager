"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isFirebaseConfigured } from "@/lib/firebase";
import { useAuth } from "@/components/auth-provider";
import {
  CalendarIcon,
  FileIcon,
  GoogleIcon,
  LockIcon,
  MailIcon,
  UsersIcon
} from "@/components/icons";

const featureItems = [
  {
    label: "Clients",
    Icon: UsersIcon
  },
  {
    label: "Schedule",
    Icon: CalendarIcon
  },
  {
    label: "Invoices",
    Icon: FileIcon
  }
];

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
    let isRedirecting = false;

    try {
      const signInMethod = await signInWithGoogle();

      if (signInMethod === "popup") {
        router.replace("/dashboard");
      } else {
        isRedirecting = true;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in with Google.");
    } finally {
      if (!isRedirecting) {
        setSubmitting(false);
      }
    }
  }

  return (
    <main className="flex min-h-screen items-start justify-center px-3 py-3 sm:items-center sm:px-4 sm:py-8">
      <section className="grid w-full max-w-4xl overflow-hidden rounded-lg border border-line bg-white shadow-soft md:grid-cols-[0.9fr_1fr]">
        <div className="bg-ink px-5 py-5 text-white sm:p-8 md:flex md:min-h-[500px] md:flex-col md:justify-between">
          <div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-brand-100">
                  Shree
                </p>
                <p className="mt-1 text-lg font-semibold">Cleaning Manager</p>
              </div>
              <div className="hidden rounded-full border border-white/[0.15] bg-white/[0.08] px-3 py-1 text-xs font-semibold text-white/80 sm:block">
                Private workspace
              </div>
            </div>

            <h1 className="mt-4 max-w-md text-2xl font-semibold leading-tight tracking-tight sm:text-3xl md:mt-8 md:text-4xl">
              Cleaning jobs, invoices, and payments in one place.
            </h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-white/[0.72] md:mt-4">
              Sign in to manage your synced customer records and booking schedule.
            </p>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 md:mt-8">
            {featureItems.map(({ label, Icon }) => (
              <div
                className="flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-md border border-white/10 bg-white/[0.06] px-2 py-2 text-center text-[11px] font-semibold text-white/[0.82]"
                key={label}
              >
                <Icon className="h-4 w-4 text-brand-100" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 sm:p-8 md:p-10">
          <div className="mb-5 sm:mb-7">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
              Account access
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-ink">
              {isRegistering ? "Create your account" : "Sign in"}
            </h2>
            <p className="mt-2 text-sm leading-5 text-muted">
              Continue with Google or use your email password.
            </p>
          </div>

          {!isFirebaseConfigured ? (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-ink">
              Firebase environment variables are missing. Add the values from your Firebase web app to
              `.env.local`, then restart the app.
            </div>
          ) : null}

          <button
            className="btn-secondary w-full gap-3"
            disabled={!isFirebaseConfigured || submitting}
            onClick={handleGoogleSignIn}
            type="button"
          >
            <GoogleIcon className="h-5 w-5" />
            Continue with Google
          </button>

          <div className="my-4 flex items-center gap-3 sm:my-5">
            <span className="h-px flex-1 bg-line" />
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              or
            </span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <form className="space-y-3.5 sm:space-y-4" onSubmit={handleEmailSubmit}>
            <label className="block">
              <span className="field-label">Email</span>
              <span className="relative block">
                <MailIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  autoComplete="email"
                  className="field pl-10"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                  type="email"
                  value={email}
                />
              </span>
            </label>

            <label className="block">
              <span className="field-label">Password</span>
              <span className="relative block">
                <LockIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  autoComplete={isRegistering ? "new-password" : "current-password"}
                  className="field pl-10"
                  minLength={6}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 6 characters"
                  required
                  type="password"
                  value={password}
                />
              </span>
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
            className="btn-quiet mt-3 w-full"
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
