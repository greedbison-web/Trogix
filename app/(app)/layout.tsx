export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { signOut } from "@/app/(auth)/actions";
import { getActiveBusiness } from "@/lib/queries/business";
import { getNoticesForBusiness } from "@/lib/queries/notifications";
import { getActiveImpersonation } from "@/lib/admin/impersonation";
import { stopImpersonation } from "@/app/(admin)/admin/actions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) redirect("/login");

  const [record, impersonation] = await Promise.all([
    getActiveBusiness(user.id),
    getActiveImpersonation(),
  ]);
  const notices = record ? await getNoticesForBusiness(record.business.id) : [];
  const banner = notices.find((n) => n.isMaintenanceBanner);
  const messages = notices.filter((n) => !n.isMaintenanceBanner);

  return (
    <div className="min-h-screen bg-paper">
      {impersonation ? (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--color-state-late)] px-6 py-2.5 text-white">
          <p className="text-micro font-medium">
            Trogix support is viewing this account
            {impersonation.adminEmail ? ` as ${impersonation.adminEmail}` : ""}.
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

      {banner ? (
        <div className="bg-ink px-6 py-2.5 text-center text-micro text-paper">
          <span className="font-medium">{banner.title}</span> — {banner.body}
        </div>
      ) : null}
      <header className="border-b border-paper-edge bg-paper-raised">
        <div className="mx-auto flex h-[64px] w-full max-w-[1180px] items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-serif text-[1.4rem] leading-none">
              Trogix
            </Link>
            <nav aria-label="Primary" className="hidden items-center gap-5 md:flex">
              {[
                { href: "/dashboard", label: "Overview" },
                { href: "/dashboard/orders", label: "Orders" },
                { href: "/dashboard/menu", label: "Menu" },
                { href: "/dashboard/tables", label: "Tables" },
                { href: "/dashboard/analytics", label: "Analytics" },
                { href: "/dashboard/payments", label: "Payments" },
                { href: "/kitchen", label: "Kitchen" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-caption text-ink-500 transition-colors hover:text-ink"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-micro text-ink-500 sm:block">
              {user.email}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="h-9 rounded-full border border-paper-edge px-4 text-micro font-medium text-ink-700 transition-colors duration-200 hover:border-ink-300 hover:text-ink"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1180px] px-6 py-12">
        {messages.length > 0 ? (
          <ul className="mb-8 space-y-3">
            {messages.map((notice) => (
              <li
                key={notice.id}
                className={`rounded-2xl border px-5 py-4 ${
                  notice.level === "critical"
                    ? "border-[var(--color-state-late)]/40 bg-[#F9EDE6]"
                    : "border-paper-edge bg-paper-raised"
                }`}
              >
                <p className="text-caption font-medium text-ink">{notice.title}</p>
                <p className="mt-1 text-caption text-ink-500">{notice.body}</p>
              </li>
            ))}
          </ul>
        ) : null}
        {children}
      </main>
    </div>
  );
}
