import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getUser } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/queries/business";
import { getActiveOrders, type OrderRow } from "@/lib/queries/orders";
import { KitchenBoard } from "./KitchenBoard";
import { NewOrderChime } from "./NewOrderChime";

export const metadata: Metadata = { title: "Kitchen" };
export const dynamic = "force-dynamic";

export default async function KitchenPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const record = await getActiveBusiness(user.id);
  if (!record) redirect("/onboarding");

  let orders: OrderRow[] = [];
  try {
    orders = await getActiveOrders(record.business.id);
  } catch {
    orders = [];
  }

  // Oldest first — the pass works front to back.
  orders.sort((a, b) => {
    const at = a.placedAt ? new Date(a.placedAt).getTime() : 0;
    const bt = b.placedAt ? new Date(b.placedAt).getTime() : 0;
    return at - bt;
  });

  return (
    <div className="min-h-screen bg-ink px-5 py-6">
      <header className="mb-6 flex items-baseline justify-between">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-paper/40">
          Pass · {record.business.name}
        </p>
        <div className="flex items-center gap-3">
          <NewOrderChime orderIds={orders.map((order) => order.id)} />
          <a href="/dashboard" className="text-[13px] text-paper/50 hover:text-paper">
            Dashboard
          </a>
        </div>
      </header>
      <KitchenBoard orders={orders} />
    </div>
  );
}
