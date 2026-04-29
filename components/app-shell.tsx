"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import {
  BriefcaseIcon,
  CalendarIcon,
  FileIcon,
  LayoutIcon,
  MoreIcon,
  ReceiptIcon,
  UsersIcon,
  WalletIcon
} from "@/components/icons";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutIcon },
  { href: "/jobs", label: "Schedules", icon: CalendarIcon },
  { href: "/customers", label: "Customers", icon: UsersIcon },
  { href: "/items", label: "Items", icon: BriefcaseIcon },
  { href: "/quotes", label: "Quotes", icon: ReceiptIcon },
  { href: "/invoices", label: "Invoices", icon: FileIcon },
  { href: "/payments", label: "Payments Received", icon: WalletIcon }
];

const mobilePrimaryItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutIcon },
  { href: "/jobs", label: "Schedules", icon: CalendarIcon },
  { href: "/quotes", label: "Quotes", icon: ReceiptIcon },
  { href: "/invoices", label: "Invoices", icon: FileIcon }
];

const moreItems = [
  { href: "/customers", label: "Customers", icon: UsersIcon },
  { href: "/items", label: "Items", icon: BriefcaseIcon },
  { href: "/payments", label: "Payments Received", icon: WalletIcon }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOutUser } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
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

  const moreActive = moreItems.some((item) => pathname === item.href);

  return (
    <div className="min-h-screen bg-mist lg:h-screen lg:min-h-0 lg:overflow-hidden">
      <aside className="hidden border-r border-line bg-white/98 lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-[264px] lg:flex-col">
        <div className="border-b border-line p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-600">
            Shree
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-ink">
            Cleaning Manager
          </h1>
        </div>

        <nav className="min-h-0 flex-1 space-y-1 overflow-hidden p-4">
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

        <div className="mt-auto shrink-0 border-t border-line p-4">
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

      <div className="min-w-0 pb-20 lg:fixed lg:inset-y-0 lg:left-[264px] lg:right-0 lg:overflow-y-auto lg:overscroll-contain lg:pb-0">
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

        <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-5 lg:px-6 lg:py-6">
          {children}
        </main>

        {moreOpen ? (
          <div className="fixed inset-x-3 bottom-20 z-40 rounded-lg border border-line bg-white p-2 shadow-soft lg:hidden">
            {moreItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  className={`flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold ${
                    isActive ? "bg-brand-50 text-brand-700" : "text-muted"
                  }`}
                  href={item.href}
                  key={item.href}
                  onClick={() => setMoreOpen(false)}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ) : null}

        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-white/96 shadow-[0_-10px_30px_rgba(23,32,28,0.08)] backdrop-blur lg:hidden">
          {mobilePrimaryItems.map((item) => {
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
          <button
            className={`flex min-h-16 flex-col items-center justify-center gap-1 px-2 text-center text-[11px] font-semibold ${
              moreActive || moreOpen ? "text-brand-700" : "text-muted"
            }`}
            onClick={() => setMoreOpen((current) => !current)}
            type="button"
          >
            <span
              className={`flex h-8 w-10 items-center justify-center rounded-md ${
                moreActive || moreOpen ? "bg-brand-50" : ""
              }`}
            >
              <MoreIcon className="h-5 w-5" />
            </span>
            More
          </button>
        </nav>
      </div>
    </div>
  );
}
