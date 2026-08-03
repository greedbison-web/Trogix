import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { getUser } from "@/lib/supabase/server";
import { getBusinessForOwner } from "@/lib/queries/business";
import { getTables, type TableRow } from "@/lib/queries/tables";
import { TableManager } from "./TableManager";

export const metadata: Metadata = { title: "Tables" };

export default async function TablesPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const record = await getBusinessForOwner(user.id);
  if (!record) redirect("/onboarding");

  let tables: TableRow[] = [];
  try {
    tables = await getTables(record.business.id);
  } catch {
    tables = [];
  }

  const host = (await headers()).get("host") ?? "trogix.co.in";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const menuBaseUrl = `${protocol}://${host}/m/${record.business.slug}`;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-serif text-[2.25rem] leading-none tracking-[-0.02em]">
          Tables
        </h1>
        <p className="mt-2 text-caption text-ink-500">
          Each table gets its own QR code. Scanning it opens your menu with the
          table already selected.
        </p>
      </header>

      <TableManager tables={tables} menuBaseUrl={menuBaseUrl} />
    </div>
  );
}
