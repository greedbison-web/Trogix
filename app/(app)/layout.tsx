export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { signOut } from "@/app/(auth)/actions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-paper">
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
      <main className="mx-auto w-full max-w-[1180px] px-6 py-12">{children}</main>
    </div>
  );
}
