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

/** Only active categories with at least one available item reach a guest. */
export async function getPublicMenu(businessId: string): Promise<MenuCategory[]> {
  const menu = await getMenu(businessId);
  return menu
    .filter((category) => category.isActive)
    .map((category) => ({
      ...category,
      items: category.items.filter((item) => item.isAvailable),
    }))
    .filter((category) => category.items.length > 0);
}
