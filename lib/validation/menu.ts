import { z } from "zod";
import { slugify } from "./business";

export const SPICE_LEVELS = [
  { value: "none", label: "Not spicy" },
  { value: "mild", label: "Mild" },
  { value: "medium", label: "Medium" },
  { value: "hot", label: "Hot" },
] as const;

const uuid = z.string().uuid();

/** Rupees in, paise out. Money never touches a float. */
const priceField = z
  .string()
  .trim()
  .min(1, "Enter a price.")
  .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), "Enter a valid amount.")
  .transform((v) => Math.round(Number(v) * 100))
  .refine((v) => v >= 0 && v <= 100_000_00, "Price is out of range.");

export const categorySchema = z.object({
  id: uuid.optional(),
  name: z
    .string()
    .trim()
    .min(2, "Category name must be at least 2 characters.")
    .max(60, "Category name is too long."),
  description: z
    .string()
    .trim()
    .max(240, "Description is too long.")
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  isActive: z.coerce.boolean().default(true),
});

export const variantSchema = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(1, "Variant name is required.").max(40),
  priceDelta: z
    .string()
    .trim()
    .default("0")
    .refine((v) => /^-?\d+(\.\d{1,2})?$/.test(v), "Enter a valid amount.")
    .transform((v) => Math.round(Number(v) * 100)),
  isDefault: z.coerce.boolean().default(false),
});

export const addonSchema = z.object({
  name: z.string().trim().min(1, "Add-on name is required.").max(40),
  price: z
    .string()
    .trim()
    .default("0")
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), "Enter a valid amount.")
    .transform((v) => Math.round(Number(v) * 100)),
});

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export const menuItemSchema = z.object({
  id: uuid.optional(),
  categoryId: uuid,
  name: z
    .string()
    .trim()
    .min(2, "Item name must be at least 2 characters.")
    .max(80, "Item name is too long."),
  description: z
    .string()
    .trim()
    .max(400, "Description is too long.")
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  price: priceField,
  isVegetarian: z.coerce.boolean().default(false),
  isAvailable: z.coerce.boolean().default(true),
  isRecommended: z.coerce.boolean().default(false),
  isBestseller: z.coerce.boolean().default(false),
  spiceLevel: z.enum(["none", "mild", "medium", "hot"]).default("none"),
  preparationMinutes: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : Number(v)))
    .refine(
      (v) => v === undefined || (Number.isInteger(v) && v > 0 && v <= 240),
      "Preparation time must be between 1 and 240 minutes.",
    ),
  variants: z.array(variantSchema).max(12, "Too many variants.").default([]),
  addons: z.array(addonSchema).max(20, "Too many add-ons.").default([]),
  availableFrom: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : v))
    .refine((v) => v === undefined || TIME.test(v), "Use a 24-hour time."),
  availableUntil: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : v))
    .refine((v) => v === undefined || TIME.test(v), "Use a 24-hour time."),
  /** Bitmask, bit 0 = Sunday. 127 or undefined means every day. */
  availableDays: z.coerce.number().int().min(0).max(127).optional(),
});

export const reorderSchema = z.object({
  ids: z.array(uuid).min(1),
});

export const bulkSchema = z.object({
  ids: z.array(uuid).min(1, "Select at least one item."),
});

export type CategoryInput = z.infer<typeof categorySchema>;
export type MenuItemInput = z.infer<typeof menuItemSchema>;

export { slugify };

/** Appends -2, -3 … until the slug is free within the business. */
export function uniqueSlug(base: string, taken: Set<string>): string {
  const root = slugify(base) || "item";
  if (!taken.has(root)) return root;
  let n = 2;
  while (taken.has(`${root}-${n}`)) n += 1;
  return `${root}-${n}`;
}
