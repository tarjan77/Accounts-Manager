"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import {
  CalendarIcon,
  DownloadIcon,
  LayoutIcon,
  UsersIcon
} from "@/components/icons";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutIcon },
  { href: "/jobs", label: "Schedule", icon: CalendarIcon },
  { href: "/customers", label: "Clients", icon: UsersIcon },
  { href: "/export", label: "Export", icon: DownloadIcon }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOutUser } = useAuth();
  const initials =
    user?.displayName
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || user?.email?.[0]?.toUpperCase() || "S";

  async function handleSignOut() {
    await signOutUser();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-mist lg:grid lg:grid-cols-[264px_1fr]">
      <aside className="hidden border-r border-line bg-white/98 lg:flex lg:flex-col">
        <div className="border-b border-line p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-600">
            Shree
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-ink">
            Cleaning Manager
          </h1>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                className={`flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold transition ${
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-muted hover:bg-mist hover:text-ink"
                }`}
                href={item.href}
                key={item.href}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-line p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">
                {user?.displayName || "Signed in"}
              </p>
              <p className="truncate text-xs text-muted">{user?.email}</p>
            </div>
          </div>
          <button className="btn-secondary mt-4 w-full" onClick={handleSignOut} type="button">
            Sign out
          </button>
        </div>
      </aside>

      <div className="min-w-0 pb-20 lg:pb-0">
        <header className="sticky top-0 z-20 border-b border-line bg-white/94 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                Shree
              </p>
              <p className="text-base font-semibold text-ink">Cleaning Manager</p>
            </div>
            <button className="btn-secondary min-h-9 px-3" onClick={handleSignOut} type="button">
              Sign out
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-white/96 shadow-[0_-10px_30px_rgba(23,32,28,0.08)] backdrop-blur lg:hidden">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                className={`flex min-h-16 flex-col items-center justify-center gap-1 px-2 text-center text-[11px] font-semibold ${
                  isActive ? "text-brand-700" : "text-muted"
                }`}
                href={item.href}
                key={item.href}
              >
                <span
                  className={`flex h-8 w-10 items-center justify-center rounded-md ${
                    isActive ? "bg-brand-50" : ""
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
