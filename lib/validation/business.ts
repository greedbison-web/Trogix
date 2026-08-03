import { z } from "zod";

export const BUSINESS_TYPES = [
  { value: "restaurant", label: "Restaurant" },
  { value: "cafe", label: "Cafe" },
  { value: "cloud_kitchen", label: "Cloud Kitchen" },
] as const;

export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
] as const;

/** Reserved so a slug can never shadow an app route. */
const RESERVED_SLUGS = new Set([
  "api", "auth", "login", "signup", "dashboard", "onboarding", "admin",
  "menu", "order", "kitchen", "settings", "about", "trogix", "www",
]);

export const GST_REGEX =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "-")
    .slice(0, 48)
    .replace(/^-+|-+$/g, "");
}

export const businessSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Business name must be at least 2 characters.")
    .max(80, "Business name is too long."),

  type: z.enum(["restaurant", "cafe", "cloud_kitchen"], {
    message: "Choose a business type.",
  }),

  ownerName: z
    .string()
    .trim()
    .min(2, "Owner name must be at least 2 characters.")
    .max(80, "Owner name is too long."),

  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number."),

  gst: z
    .string()
    .trim()
    .transform((v) => (v === "" ? undefined : v.toUpperCase()))
    .optional()
    .refine((v) => v === undefined || GST_REGEX.test(v), {
      message: "Enter a valid 15-character GSTIN.",
    }),

  addressLine: z
    .string()
    .trim()
    .min(5, "Enter the street address.")
    .max(180, "Address is too long."),

  city: z.string().trim().min(2, "Enter the city.").max(60),

  state: z.string().trim().min(2, "Select the state."),

  pincode: z
    .string()
    .trim()
    .regex(/^[1-9][0-9]{5}$/, "Enter a valid 6-digit pincode."),

  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Link must be at least 3 characters.")
    .max(48, "Link is too long.")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers and hyphens only.",
    )
    .refine((v) => !RESERVED_SLUGS.has(v), { message: "That link is reserved." }),

  timezone: z.string().trim().min(1).default("Asia/Kolkata"),
  currency: z.string().trim().min(1).default("INR"),
});

export type BusinessInput = z.infer<typeof businessSchema>;
