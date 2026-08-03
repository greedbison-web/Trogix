import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { getMenu, type MenuCategory } from "./menu";

export type PublicVenue = {
  businessId: string;
  name: string;
  slug: string;
  currency: string;
  timezone: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  serviceCharge: number;
  taxEnabled: boolean;
  receiptFooter: string | null;
  /** True only when the restaurant's own gateway account is connected. */
  acceptsPayments: boolean;
};

export type PublicTable = { id: string; label: string } | null;

/** Guest-facing venue lookup by public slug. */
export async function getVenue(slug: string): Promise<PublicVenue | null> {
  const db = getDb();
  const rows = await db
    .select({
      business: schema.businesses,
      settings: schema.businessSettings,
    })
    .from(schema.businesses)
    .leftJoin(
      schema.businessSettings,
      eq(schema.businessSettings.businessId, schema.businesses.id),
    )
    .where(
      and(eq(schema.businesses.slug, slug), isNull(schema.businesses.deletedAt)),
    )
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const [account] = await db
    .select({ status: schema.paymentAccounts.status })
    .from(schema.paymentAccounts)
    .where(
      and(
        eq(schema.paymentAccounts.businessId, row.business.id),
        eq(schema.paymentAccounts.provider, "razorpay"),
      ),
    )
    .limit(1);

  return {
    businessId: row.business.id,
    name: row.business.name,
    slug: row.business.slug,
    currency: row.business.currency,
    timezone: row.business.timezone,
    logoUrl: row.settings?.logoUrl ?? row.business.logoUrl,
    primaryColor: row.settings?.primaryColor ?? "#111111",
    secondaryColor: row.settings?.secondaryColor ?? "#449EB9",
    serviceCharge: row.settings?.serviceCharge ?? 0,
    taxEnabled: row.settings?.taxEnabled ?? true,
    receiptFooter: row.settings?.receiptFooter ?? null,
    acceptsPayments: account?.status === "connected",
  };
}

export async function getTableByToken(
  businessId: string,
  token: string | undefined,
): Promise<PublicTable> {
  if (!token) return null;
  const db = getDb();
  const rows = await db
    .select({
      id: schema.restaurantTables.id,
      label: schema.restaurantTables.label,
    })
    .from(schema.restaurantTables)
    .where(
      and(
        eq(schema.restaurantTables.businessId, businessId),
        eq(schema.restaurantTables.qrToken, token),
        isNull(schema.restaurantTables.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Local weekday and HH:MM for the restaurant, used by the scheduler. */
function localNow(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekdayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
    get("weekday"),
  );
  return { weekday: weekdayIndex < 0 ? 0 : weekdayIndex, time: `${get("hour")}:${get("minute")}` };
}

function isScheduledNow(
  item: { availableDays: number | null; availableFrom: string | null; availableUntil: string | null },
  now: { weekday: number; time: string },
) {
  if (item.availableDays !== null && (item.availableDays & (1 << now.weekday)) === 0) {
    return false;
  }
  const { availableFrom: from, availableUntil: until } = item;
  if (!from || !until) return true;
  // A window that wraps midnight (22:00–02:00) is open on either side.
  return from <= until
    ? now.time >= from && now.time <= until
    : now.time >= from || now.time <= until;
}

/**
 * Only active categories with at least one item that is both marked available
 * and inside its schedule reach a guest.
 */
export async function getPublicMenu(
  businessId: string,
  timezone = "Asia/Kolkata",
): Promise<MenuCategory[]> {
  const menu = await getMenu(businessId);
  const now = localNow(timezone);

  return menu
    .filter((category) => category.isActive)
    .map((category) => ({
      ...category,
      items: category.items.filter(
        (item) => item.isAvailable && isScheduledNow(item, now),
      ),
    }))
    .filter((category) => category.items.length > 0);
}
