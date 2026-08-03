import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getUser } from "@/lib/supabase/server";
import { getBusinessForOwner } from "@/lib/queries/business";
import { getMenu, type MenuCategory } from "@/lib/queries/menu";
import { MenuBuilder } from "./MenuBuilder";

export const metadata: Metadata = { title: "Menu" };

export default async function MenuPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const record = await getBusinessForOwner(user.id);
  if (!record) redirect("/onboarding");

  let categories: MenuCategory[] = [];
  try {
    categories = await getMenu(record.business.id);
  } catch {
    categories = [];
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-serif text-[2.25rem] leading-none tracking-[-0.02em]">
          Menu
        </h1>
        <p className="mt-2 text-caption text-ink-500">
          Drag to reorder. Changes are live for guests immediately.
        </p>
      </header>

      <MenuBuilder
        categories={categories}
        currency={record.business.currency}
        businessName={record.business.name}
      />
    </div>
  );
}
