import { z } from "zod";

/** Indian mobile number, stored as ten digits without a country code. */
export const PHONE_REGEX = /^[6-9]\d{9}$/;

export function normalizePhone(input: string): string {
  return input.replace(/\D/g, "").replace(/^(?:0|91)(?=\d{10}$)/, "");
}

export const signUpSchema = z.object({
  ownerName: z
    .string()
    .trim()
    .min(2, "Enter your full name.")
    .max(80, "Name is too long."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address.")
    .max(180, "Email is too long."),
  phone: z
    .string()
    .transform(normalizePhone)
    .refine((v) => PHONE_REGEX.test(v), {
      message: "Enter a valid 10-digit Indian mobile number.",
    }),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(72, "Password is too long."),
});

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export const otpSchema = z.object({
  code: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length === 6, { message: "Enter the 6-digit code." }),
});

export type SignUpValues = z.infer<typeof signUpSchema>;
