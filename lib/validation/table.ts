import { z } from "zod";

export const tableSchema = z.object({
  id: z.string().uuid().optional(),
  label: z
    .string()
    .trim()
    .min(1, "Enter a table name.")
    .max(24, "Table name is too long."),
  section: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  seats: z.coerce
    .number()
    .int()
    .min(1, "At least one seat.")
    .max(40, "Too many seats."),
});

export const bulkTableSchema = z.object({
  count: z.coerce.number().int().min(1).max(50),
  prefix: z.string().trim().max(12).default(""),
  startAt: z.coerce.number().int().min(1).max(999).default(1),
  seats: z.coerce.number().int().min(1).max(40).default(2),
});

/** URL-safe token embedded in the QR target. */
export function newQrToken() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 20);
}
