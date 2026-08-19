import "server-only";
import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { isPreview } from "@/lib/preview/mode";

export type TableRow = {
  id: string;
  label: string;
  section: string | null;
  seats: number;
  status: "available" | "seated" | "billed" | "inactive";
  qrToken: string;
};

export async function getTables(businessId: string): Promise<TableRow[]> {
  if (isPreview()) return (await import("@/lib/preview/data")).previewTables;
  const db = getDb();
  const rows = await db
    .select({
      id: schema.restaurantTables.id,
      label: schema.restaurantTables.label,
      section: schema.restaurantTables.section,
      seats: schema.restaurantTables.seats,
      status: schema.restaurantTables.status,
      qrToken: schema.restaurantTables.qrToken,
    })
    .from(schema.restaurantTables)
    .where(
      and(
        eq(schema.restaurantTables.businessId, businessId),
        isNull(schema.restaurantTables.deletedAt),
      ),
    )
    .orderBy(asc(schema.restaurantTables.sortOrder), asc(schema.restaurantTables.label));
  return rows;
}
