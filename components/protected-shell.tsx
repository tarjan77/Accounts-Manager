"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";

export function ProtectedShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, router, user]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-mist px-4">
        <div className="card w-full max-w-sm p-6 text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-line border-t-brand-600" />
          <p className="mt-4 text-sm font-medium text-muted">Loading workspace...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return <AppShell>{children}</AppShell>;
}
