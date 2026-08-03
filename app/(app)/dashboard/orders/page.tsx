import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getUser } from "@/lib/supabase/server";
import { getBusinessForOwner } from "@/lib/queries/business";
import { getOrders, type OrderRow } from "@/lib/queries/orders";
import { OrdersBoard } from "./OrdersBoard";

export const metadata: Metadata = { title: "Orders" };
export const dynamic = "force-dynamic";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect("/login");

  const record = await getBusinessForOwner(user.id);
  if (!record) redirect("/onboarding");

  const raw = (await searchParams).filter;
  const filter: "active" | "today" | "all" =
    raw === "today" || raw === "all" ? raw : "active";

  let orders: OrderRow[] = [];
  try {
    orders = await getOrders(record.business.id, filter, record.business.timezone);
  } catch {
    orders = [];
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-serif text-[2.25rem] leading-none tracking-[-0.02em]">
          Orders
        </h1>
        <p className="mt-2 text-caption text-ink-500">
          Live from the floor. Refreshes automatically.
        </p>
      </header>

      <OrdersBoard
        orders={orders}
        currency={record.business.currency}
        timezone={record.business.timezone}
        filter={filter}
      />
    </div>
  );
}
