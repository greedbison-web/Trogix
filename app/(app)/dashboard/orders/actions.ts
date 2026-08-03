"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";
import { getBusinessForOwner } from "@/lib/queries/business";
import type { ActionResult } from "../menu/types";

const statusSchema = z.enum([
  "placed", "accepted", "preparing", "ready", "served", "completed", "cancelled",
]);

async function requireBusiness() {
  const user = await getUser();
  if (!user) throw new Error("Not signed in.");
  const record = await getBusinessForOwner(user.id);
  if (!record) throw new Error("No business found.");
  return record.business;
}

const ok = (): ActionResult => ({ ok: true, errors: {}, message: null });
const fail = (message: string): ActionResult => ({ ok: false, errors: {}, message });

function refresh() {
  revalidatePath("/dashboard/orders");
  revalidatePath("/kitchen");
  revalidatePath("/dashboard");
}

export async function setOrderStatus(
  orderId: string,
  status: string,
): Promise<ActionResult> {
  let business;
  try {
    business = await requireBusiness();
  } catch {
    return fail("Your session expired. Sign in again.");
  }

  const parsed = statusSchema.safeParse(status);
  if (!parsed.success) return fail("Unknown status.");

  const db = getDb();
  const now = new Date();

  try {
    await db
      .update(schema.orders)
      .set({
        status: parsed.data,
        ...(parsed.data === "completed" ? { completedAt: now } : {}),
        ...(parsed.data === "cancelled" ? { cancelledAt: now } : {}),
      })
      .where(
        and(eq(schema.orders.id, orderId), eq(schema.orders.businessId, business.id)),
      );

    // Free the table once the order leaves the floor.
    if (parsed.data === "completed" || parsed.data === "cancelled") {
      const [order] = await db
        .select({ tableId: schema.orders.tableId })
        .from(schema.orders)
        .where(eq(schema.orders.id, orderId))
        .limit(1);

      if (order?.tableId) {
        const [{ open }] = await db
          .select({
            open: sql<number>`count(*) filter (where status in ('placed','accepted','preparing','ready','served'))::int`,
          })
          .from(schema.orders)
          .where(eq(schema.orders.tableId, order.tableId));

        if (open === 0) {
          await db
            .update(schema.restaurantTables)
            .set({ status: "available" })
            .where(eq(schema.restaurantTables.id, order.tableId));
        }
      }
    }
  } catch {
    return fail("Could not update the order.");
  }

  refresh();
  return ok();
}
