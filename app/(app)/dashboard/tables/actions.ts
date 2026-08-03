"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";
import { getBusinessForOwner } from "@/lib/queries/business";
import { tableSchema, bulkTableSchema, newQrToken } from "@/lib/validation/table";
import type { ActionResult } from "../menu/types";

async function requireBusiness() {
  const user = await getUser();
  if (!user) throw new Error("Not signed in.");
  const record = await getBusinessForOwner(user.id);
  if (!record) throw new Error("No business found.");
  return record.business;
}

const ok = (): ActionResult => ({ ok: true, errors: {}, message: null });
const fail = (message: string, errors: Record<string, string> = {}): ActionResult => ({
  ok: false,
  errors,
  message,
});

function refresh() {
  revalidatePath("/dashboard/tables");
  revalidatePath("/dashboard");
}

export async function saveTable(formData: FormData): Promise<ActionResult> {
  let business;
  try {
    business = await requireBusiness();
  } catch {
    return fail("Your session expired. Sign in again.");
  }

  const parsed = tableSchema.safeParse({
    id: formData.get("id") || undefined,
    label: formData.get("label"),
    section: formData.get("section") ?? "",
    seats: formData.get("seats") || 2,
  });
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!errors[key]) errors[key] = issue.message;
    }
    return fail("Please fix the highlighted fields.", errors);
  }

  const values = parsed.data;
  const db = getDb();

  try {
    if (values.id) {
      await db
        .update(schema.restaurantTables)
        .set({
          label: values.label,
          section: values.section ?? null,
          seats: values.seats,
        })
        .where(
          and(
            eq(schema.restaurantTables.id, values.id),
            eq(schema.restaurantTables.businessId, business.id),
          ),
        );
    } else {
      const [{ value: nextOrder } = { value: 0 }] = await db
        .select({
          value: sql<number>`coalesce(max(${schema.restaurantTables.sortOrder}), -1) + 1`,
        })
        .from(schema.restaurantTables)
        .where(eq(schema.restaurantTables.businessId, business.id));

      await db.insert(schema.restaurantTables).values({
        businessId: business.id,
        label: values.label,
        section: values.section ?? null,
        seats: values.seats,
        qrToken: newQrToken(),
        sortOrder: nextOrder,
      });
    }
  } catch (error) {
    const duplicate = error instanceof Error && /unique|duplicate/i.test(error.message);
    return duplicate
      ? fail("That table name is already used.", { label: "Already used." })
      : fail("Could not save the table.");
  }

  refresh();
  return ok();
}

export async function createTablesInBulk(formData: FormData): Promise<ActionResult> {
  let business;
  try {
    business = await requireBusiness();
  } catch {
    return fail("Your session expired. Sign in again.");
  }

  const parsed = bulkTableSchema.safeParse({
    count: formData.get("count"),
    prefix: formData.get("prefix") ?? "",
    startAt: formData.get("startAt") || 1,
    seats: formData.get("seats") || 2,
  });
  if (!parsed.success) return fail("Check the numbers and try again.");

  const { count, prefix, startAt, seats } = parsed.data;
  const db = getDb();

  const existing = await db
    .select({ label: schema.restaurantTables.label })
    .from(schema.restaurantTables)
    .where(eq(schema.restaurantTables.businessId, business.id));
  const taken = new Set(existing.map((r) => r.label));

  const [{ value: nextOrder } = { value: 0 }] = await db
    .select({
      value: sql<number>`coalesce(max(${schema.restaurantTables.sortOrder}), -1) + 1`,
    })
    .from(schema.restaurantTables)
    .where(eq(schema.restaurantTables.businessId, business.id));

  const rows = [];
  let n = startAt;
  while (rows.length < count) {
    const label = `${prefix}${n}`;
    if (!taken.has(label)) {
      rows.push({
        businessId: business.id,
        label,
        seats,
        qrToken: newQrToken(),
        sortOrder: nextOrder + rows.length,
      });
      taken.add(label);
    }
    n += 1;
    if (n > startAt + count + 200) break;
  }

  if (rows.length === 0) return fail("Those table names already exist.");

  try {
    await db.insert(schema.restaurantTables).values(rows);
  } catch {
    return fail("Could not create the tables.");
  }

  refresh();
  return ok();
}

export async function deleteTable(formData: FormData): Promise<ActionResult> {
  let business;
  try {
    business = await requireBusiness();
  } catch {
    return fail("Your session expired. Sign in again.");
  }

  const id = String(formData.get("id") ?? "");
  if (!id) return fail("Table not found.");

  const db = getDb();
  await db
    .update(schema.restaurantTables)
    .set({ deletedAt: new Date(), status: "inactive" })
    .where(
      and(
        eq(schema.restaurantTables.id, id),
        eq(schema.restaurantTables.businessId, business.id),
      ),
    );

  refresh();
  return ok();
}

export async function regenerateQr(formData: FormData): Promise<ActionResult> {
  let business;
  try {
    business = await requireBusiness();
  } catch {
    return fail("Your session expired. Sign in again.");
  }

  const id = String(formData.get("id") ?? "");
  if (!id) return fail("Table not found.");

  const db = getDb();
  await db
    .update(schema.restaurantTables)
    .set({ qrToken: newQrToken() })
    .where(
      and(
        eq(schema.restaurantTables.id, id),
        eq(schema.restaurantTables.businessId, business.id),
        isNull(schema.restaurantTables.deletedAt),
      ),
    );

  refresh();
  return ok();
}
