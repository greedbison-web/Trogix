import "server-only";
import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

import { WEEKDAYS, type HoursRow } from "@/lib/settings-constants";

export { WEEKDAYS, type HoursRow };

/** Always returns seven rows, defaulted for days never configured. */
export async function getOperatingHours(businessId: string): Promise<HoursRow[]> {
  const defaults: HoursRow[] = WEEKDAYS.map((_, weekday) => ({
    weekday,
    isOpen: true,
    opensAt: "11:00",
    closesAt: "23:00",
  }));

  try {
    const db = getDb();
    const rows = await db
      .select({
        weekday: schema.operatingHours.weekday,
        isOpen: schema.operatingHours.isOpen,
        opensAt: schema.operatingHours.opensAt,
        closesAt: schema.operatingHours.closesAt,
      })
      .from(schema.operatingHours)
      .where(eq(schema.operatingHours.businessId, businessId))
      .orderBy(asc(schema.operatingHours.weekday));

    for (const row of rows) {
      if (row.weekday >= 0 && row.weekday < 7) defaults[row.weekday] = row;
    }
    return defaults;
  } catch {
    return defaults;
  }
}

export async function getStaff(businessId: string) {
  try {
    const db = getDb();
    return await db
      .select({
        id: schema.staffMembers.id,
        name: schema.staffMembers.name,
        email: schema.staffMembers.email,
        phone: schema.staffMembers.phone,
        role: schema.staffMembers.role,
        status: schema.staffMembers.status,
      })
      .from(schema.staffMembers)
      .where(
        and(
          eq(schema.staffMembers.businessId, businessId),
          isNull(schema.staffMembers.deletedAt),
        ),
      )
      .orderBy(asc(schema.staffMembers.createdAt));
  } catch {
    return [];
  }
}
