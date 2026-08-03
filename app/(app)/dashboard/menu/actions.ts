"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { getUser, createClient } from "@/lib/supabase/server";
import { getBusinessForOwner } from "@/lib/queries/business";
import { takenSlugs } from "@/lib/queries/menu";
import {
  categorySchema,
  menuItemSchema,
  reorderSchema,
  bulkSchema,
  uniqueSlug,
} from "@/lib/validation/menu";
import type { ActionResult } from "./types";

const IMAGE_BUCKET = "menu-images";
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

async function requireBusiness() {
  const user = await getUser();
  if (!user) throw new Error("Not signed in.");
  const record = await getBusinessForOwner(user.id);
  if (!record) throw new Error("No business found.");
  return { user, business: record.business };
}

function fieldErrors(error: import("zod").ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

function ok(): ActionResult {
  return { ok: true, errors: {}, message: null };
}

function fail(message: string, errors: Record<string, string> = {}): ActionResult {
  return { ok: false, errors, message };
}

function refresh() {
  revalidatePath("/dashboard/menu");
  revalidatePath("/dashboard");
}

/* ------------------------------------------------------------- Categories */

export async function saveCategory(formData: FormData): Promise<ActionResult> {
  let business;
  try {
    ({ business } = await requireBusiness());
  } catch {
    return fail("Your session expired. Sign in again.");
  }

  const parsed = categorySchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
  });
  if (!parsed.success) return fail("Please fix the highlighted fields.", fieldErrors(parsed.error));

  const values = parsed.data;
  const db = getDb();

  try {
    if (values.id) {
      await db
        .update(schema.categories)
        .set({
          name: values.name,
          description: values.description ?? null,
          isActive: values.isActive,
        })
        .where(
          and(
            eq(schema.categories.id, values.id),
            eq(schema.categories.businessId, business.id),
          ),
        );
    } else {
      const slugs = await takenSlugs(business.id, "categories");
      const [{ value: nextOrder } = { value: 0 }] = await db
        .select({ value: sql<number>`coalesce(max(${schema.categories.sortOrder}), -1) + 1` })
        .from(schema.categories)
        .where(eq(schema.categories.businessId, business.id));

      await db.insert(schema.categories).values({
        businessId: business.id,
        name: values.name,
        slug: uniqueSlug(values.name, slugs),
        description: values.description ?? null,
        isActive: values.isActive,
        sortOrder: nextOrder,
      });
    }
  } catch {
    return fail("Could not save the category.");
  }

  refresh();
  return ok();
}

export async function deleteCategory(formData: FormData): Promise<ActionResult> {
  let business;
  try {
    ({ business } = await requireBusiness());
  } catch {
    return fail("Your session expired. Sign in again.");
  }

  const id = String(formData.get("id") ?? "");
  if (!id) return fail("Category not found.");

  const db = getDb();

  const [{ value: itemCount } = { value: 0 }] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(schema.menuItems)
    .where(
      and(
        eq(schema.menuItems.categoryId, id),
        isNull(schema.menuItems.deletedAt),
      ),
    );

  if (itemCount > 0) {
    return fail(
      `Move or delete the ${itemCount} item${itemCount === 1 ? "" : "s"} in this category first.`,
    );
  }

  await db
    .update(schema.categories)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(schema.categories.id, id),
        eq(schema.categories.businessId, business.id),
      ),
    );

  refresh();
  return ok();
}

export async function reorderCategories(ids: string[]): Promise<ActionResult> {
  let business;
  try {
    ({ business } = await requireBusiness());
  } catch {
    return fail("Your session expired. Sign in again.");
  }

  const parsed = reorderSchema.safeParse({ ids });
  if (!parsed.success) return fail("Invalid order.");

  const db = getDb();
  await db.transaction(async (tx) => {
    for (const [index, id] of parsed.data.ids.entries()) {
      await tx
        .update(schema.categories)
        .set({ sortOrder: index })
        .where(
          and(
            eq(schema.categories.id, id),
            eq(schema.categories.businessId, business.id),
          ),
        );
    }
  });

  refresh();
  return ok();
}

/* ------------------------------------------------------------ Menu items */

async function uploadImage(file: File, ownerId: string): Promise<string | null> {
  if (!file || file.size === 0) return null;
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Image must be under 4 MB.");
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Image must be a PNG, JPG or WebP.");
  }

  const supabase = await createClient();
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${ownerId}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error("Could not upload the image.");

  return supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function saveMenuItem(formData: FormData): Promise<ActionResult> {
  let business;
  let user;
  try {
    ({ business, user } = await requireBusiness());
  } catch {
    return fail("Your session expired. Sign in again.");
  }

  let variantsParsed: unknown = [];
  let addonsParsed: unknown = [];
  try {
    variantsParsed = JSON.parse(String(formData.get("variants") ?? "[]"));
    addonsParsed = JSON.parse(String(formData.get("addons") ?? "[]"));
  } catch {
    return fail("Invalid options.");
  }

  const parsed = menuItemSchema.safeParse({
    id: formData.get("id") || undefined,
    categoryId: formData.get("categoryId"),
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    price: formData.get("price"),
    isVegetarian: formData.get("isVegetarian") === "true",
    isAvailable: formData.get("isAvailable") === "true",
    isRecommended: formData.get("isRecommended") === "true",
    isBestseller: formData.get("isBestseller") === "true",
    spiceLevel: formData.get("spiceLevel") || "none",
    preparationMinutes: formData.get("preparationMinutes") ?? "",
    variants: variantsParsed,
    addons: addonsParsed,
    availableFrom: formData.get("availableFrom") ?? "",
    availableUntil: formData.get("availableUntil") ?? "",
    availableDays: formData.get("availableDays") || undefined,
  });
  if (!parsed.success) return fail("Please fix the highlighted fields.", fieldErrors(parsed.error));

  const values = parsed.data;
  const db = getDb();

  // Category must belong to this business.
  const [category] = await db
    .select({ id: schema.categories.id })
    .from(schema.categories)
    .where(
      and(
        eq(schema.categories.id, values.categoryId),
        eq(schema.categories.businessId, business.id),
        isNull(schema.categories.deletedAt),
      ),
    )
    .limit(1);
  if (!category) return fail("Choose a category.", { categoryId: "Category not found." });

  // Read outside the transaction: the pool hands one connection to the
  // transaction, so a nested query issued through `db` would wait on itself.
  const slugs = values.id
    ? new Set<string>()
    : await takenSlugs(business.id, "menuItems");

  let imageUrl: string | null = null;
  const image = formData.get("image");
  if (image instanceof File && image.size > 0) {
    try {
      imageUrl = await uploadImage(image, user.id);
    } catch (error) {
      return fail("Please fix the highlighted fields.", {
        image: error instanceof Error ? error.message : "Upload failed.",
      });
    }
  }

  try {
    await db.transaction(async (tx) => {
      let itemId = values.id;

      if (itemId) {
        await tx
          .update(schema.menuItems)
          .set({
            categoryId: values.categoryId,
            name: values.name,
            description: values.description ?? null,
            price: values.price,
            isVegetarian: values.isVegetarian,
            isAvailable: values.isAvailable,
            isRecommended: values.isRecommended,
            isBestseller: values.isBestseller,
            spiceLevel: values.spiceLevel,
            preparationMinutes: values.preparationMinutes ?? null,
            availableFrom: values.availableFrom ?? null,
            availableUntil: values.availableUntil ?? null,
            availableDays: values.availableDays ?? null,
            ...(imageUrl ? { imageUrl } : {}),
          })
          .where(
            and(
              eq(schema.menuItems.id, itemId),
              eq(schema.menuItems.businessId, business.id),
            ),
          );
      } else {
        const [{ value: nextOrder } = { value: 0 }] = await tx
          .select({
            value: sql<number>`coalesce(max(${schema.menuItems.sortOrder}), -1) + 1`,
          })
          .from(schema.menuItems)
          .where(eq(schema.menuItems.categoryId, values.categoryId));

        const [created] = await tx
          .insert(schema.menuItems)
          .values({
            businessId: business.id,
            categoryId: values.categoryId,
            name: values.name,
            slug: uniqueSlug(values.name, slugs),
            description: values.description ?? null,
            price: values.price,
            imageUrl,
            isVegetarian: values.isVegetarian,
            isAvailable: values.isAvailable,
            isRecommended: values.isRecommended,
            isBestseller: values.isBestseller,
            spiceLevel: values.spiceLevel,
            preparationMinutes: values.preparationMinutes ?? null,
            availableFrom: values.availableFrom ?? null,
            availableUntil: values.availableUntil ?? null,
            availableDays: values.availableDays ?? null,
            sortOrder: nextOrder,
          })
          .returning({ id: schema.menuItems.id });
        itemId = created.id;
      }

      // Variants are replaced wholesale — the editor always submits the full set.
      await tx
        .delete(schema.itemVariants)
        .where(
          and(
            eq(schema.itemVariants.menuItemId, itemId!),
            eq(schema.itemVariants.businessId, business.id),
          ),
        );

      if (values.variants.length > 0) {
        await tx.insert(schema.itemVariants).values(
          values.variants.map((variant, index) => ({
            businessId: business.id,
            menuItemId: itemId!,
            name: variant.name,
            priceDelta: variant.priceDelta,
            isDefault: variant.isDefault,
            sortOrder: index,
          })),
        );
      }

      // Add-ons are replaced wholesale, like variants.
      await tx
        .delete(schema.itemAddons)
        .where(
          and(
            eq(schema.itemAddons.menuItemId, itemId!),
            eq(schema.itemAddons.businessId, business.id),
          ),
        );

      if (values.addons.length > 0) {
        await tx.insert(schema.itemAddons).values(
          values.addons.map((addon, index) => ({
            businessId: business.id,
            menuItemId: itemId!,
            name: addon.name,
            price: addon.price,
            sortOrder: index,
          })),
        );
      }
    });
  } catch {
    return fail("Could not save the item.");
  }

  refresh();
  return ok();
}

export async function reorderMenuItems(
  categoryId: string,
  ids: string[],
): Promise<ActionResult> {
  let business;
  try {
    ({ business } = await requireBusiness());
  } catch {
    return fail("Your session expired. Sign in again.");
  }

  const parsed = reorderSchema.safeParse({ ids });
  if (!parsed.success) return fail("Invalid order.");

  const db = getDb();
  await db.transaction(async (tx) => {
    for (const [index, id] of parsed.data.ids.entries()) {
      await tx
        .update(schema.menuItems)
        .set({ sortOrder: index, categoryId })
        .where(
          and(
            eq(schema.menuItems.id, id),
            eq(schema.menuItems.businessId, business.id),
          ),
        );
    }
  });

  refresh();
  return ok();
}

export async function setItemsAvailability(
  ids: string[],
  isAvailable: boolean,
): Promise<ActionResult> {
  let business;
  try {
    ({ business } = await requireBusiness());
  } catch {
    return fail("Your session expired. Sign in again.");
  }

  const parsed = bulkSchema.safeParse({ ids });
  if (!parsed.success) return fail("Select at least one item.");

  const db = getDb();
  await db
    .update(schema.menuItems)
    .set({ isAvailable })
    .where(
      and(
        inArray(schema.menuItems.id, parsed.data.ids),
        eq(schema.menuItems.businessId, business.id),
      ),
    );

  refresh();
  return ok();
}

export async function deleteMenuItems(ids: string[]): Promise<ActionResult> {
  let business;
  try {
    ({ business } = await requireBusiness());
  } catch {
    return fail("Your session expired. Sign in again.");
  }

  const parsed = bulkSchema.safeParse({ ids });
  if (!parsed.success) return fail("Select at least one item.");

  const db = getDb();
  await db
    .update(schema.menuItems)
    .set({ deletedAt: new Date() })
    .where(
      and(
        inArray(schema.menuItems.id, parsed.data.ids),
        eq(schema.menuItems.businessId, business.id),
      ),
    );

  refresh();
  return ok();
}
