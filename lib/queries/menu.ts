import "server-only";
import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

export type MenuVariant = {
  id: string;
  name: string;
  priceDelta: number;
  isDefault: boolean;
  isAvailable: boolean;
};

export type MenuItemRow = {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isVegetarian: boolean;
  isAvailable: boolean;
  isRecommended: boolean;
  isBestseller: boolean;
  spiceLevel: "none" | "mild" | "medium" | "hot";
  preparationMinutes: number | null;
  sortOrder: number;
  variants: MenuVariant[];
};

export type MenuCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  items: MenuItemRow[];
};

/** Full menu tree for a business, ordered as the owner arranged it. */
export async function getMenu(businessId: string): Promise<MenuCategory[]> {
  const db = getDb();

  const [categoryRows, itemRows, variantRows] = await Promise.all([
    db
      .select()
      .from(schema.categories)
      .where(
        and(
          eq(schema.categories.businessId, businessId),
          isNull(schema.categories.deletedAt),
        ),
      )
      .orderBy(asc(schema.categories.sortOrder), asc(schema.categories.name)),

    db
      .select()
      .from(schema.menuItems)
      .where(
        and(
          eq(schema.menuItems.businessId, businessId),
          isNull(schema.menuItems.deletedAt),
        ),
      )
      .orderBy(asc(schema.menuItems.sortOrder), asc(schema.menuItems.name)),

    db
      .select()
      .from(schema.itemVariants)
      .where(
        and(
          eq(schema.itemVariants.businessId, businessId),
          isNull(schema.itemVariants.deletedAt),
        ),
      )
      .orderBy(asc(schema.itemVariants.sortOrder)),
  ]);

  const variantsByItem = new Map<string, MenuVariant[]>();
  for (const variant of variantRows) {
    const list = variantsByItem.get(variant.menuItemId) ?? [];
    list.push({
      id: variant.id,
      name: variant.name,
      priceDelta: variant.priceDelta,
      isDefault: variant.isDefault,
      isAvailable: variant.isAvailable,
    });
    variantsByItem.set(variant.menuItemId, list);
  }

  const itemsByCategory = new Map<string, MenuItemRow[]>();
  for (const item of itemRows) {
    const list = itemsByCategory.get(item.categoryId) ?? [];
    list.push({
      id: item.id,
      categoryId: item.categoryId,
      name: item.name,
      slug: item.slug,
      description: item.description,
      price: item.price,
      imageUrl: item.imageUrl,
      isVegetarian: item.isVegetarian,
      isAvailable: item.isAvailable,
      isRecommended: item.isRecommended,
      isBestseller: item.isBestseller,
      spiceLevel: item.spiceLevel,
      preparationMinutes: item.preparationMinutes,
      sortOrder: item.sortOrder,
      variants: variantsByItem.get(item.id) ?? [],
    });
    itemsByCategory.set(item.categoryId, list);
  }

  return categoryRows.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    isActive: category.isActive,
    sortOrder: category.sortOrder,
    items: itemsByCategory.get(category.id) ?? [],
  }));
}

/** Slugs already in use, so new rows can pick a free one. */
export async function takenSlugs(
  businessId: string,
  table: "categories" | "menuItems",
): Promise<Set<string>> {
  const db = getDb();
  const target = table === "categories" ? schema.categories : schema.menuItems;
  const rows = await db
    .select({ slug: target.slug })
    .from(target)
    .where(eq(target.businessId, businessId));
  return new Set(rows.map((r) => r.slug));
}
