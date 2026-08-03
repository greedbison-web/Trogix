export const dynamic = "force-dynamic";

import Link from "next/link";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { getActiveImpersonation } from "@/lib/admin/impersonation";
import { stopImpersonation } from "./admin/actions";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s — Trogix Admin" },
  robots: { index: false, follow: false },
};

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/restaurants", label: "Restaurants" },
  { href: "/admin/live", label: "Live" },
  { href: "/admin/subscriptions", label: "Subscriptions" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/usage", label: "Usage & risk" },
  { href: "/admin/support", label: "Support" },
  { href: "/admin/notifications", label: "Notifications" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/security", label: "Security" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();
  const impersonation = await getActiveImpersonation();

  return (
    <div className="min-h-screen bg-paper">
      {impersonation ? (
        <div className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 bg-[var(--color-state-late)] px-6 py-2.5 text-white">
          <p className="text-micro font-medium">
            You are viewing a restaurant as an admin. Actions you take are real.
          </p>
          <form action={stopImpersonation}>
            <button
              type="submit"
              className="h-8 rounded-full bg-white/20 px-3 text-micro font-medium hover:bg-white/30"
            >
              End session
            </button>
          </form>
        </div>
      ) : null}

      <header className="border-b border-paper-edge bg-paper-raised">
        <div className="mx-auto flex h-[64px] w-full max-w-[1440px] items-center justify-between gap-6 px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/admin" className="font-serif text-[1.4rem] leading-none">
              Trogix
            </Link>
            <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-paper">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-micro text-ink-500 sm:block">
              {admin.email} · {admin.role}
            </span>
            <Link
              href="/dashboard"
              className="h-9 rounded-full border border-paper-edge px-4 text-micro font-medium leading-9 text-ink-700 hover:border-ink-300"
            >
              Exit admin
            </Link>
          </div>
        </div>

        <nav
          aria-label="Admin"
          className="mx-auto flex w-full max-w-[1440px] gap-1 overflow-x-auto px-4 pb-2"
        >
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-full px-3 py-1.5 text-micro font-medium text-ink-500 transition-colors hover:bg-paper-sunken hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-[1440px] px-6 py-10">{children}</main>
    </div>
  );
}
