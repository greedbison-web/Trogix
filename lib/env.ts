/**
 * Single source of truth for configuration.
 *
 * Nothing here throws at import time: a Vercel build runs before the runtime
 * environment is necessarily complete, and a missing optional integration must
 * degrade rather than take the whole app down. `/api/health` reports what is
 * present so a deployment can be checked without exposing any value.
 */

export type EnvGroup = {
  name: string;
  required: boolean;
  /** What stops working when this group is unset. */
  impact: string;
  vars: string[];
};

export const ENV_GROUPS: EnvGroup[] = [
  {
    name: "database",
    required: true,
    impact: "Nothing works. Every page reads from Postgres.",
    vars: ["DATABASE_URL"],
  },
  {
    name: "supabase",
    required: true,
    impact: "Nobody can sign up, sign in, or upload a logo.",
    vars: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
  },
  {
    name: "encryption",
    required: true,
    impact:
      "Signup fails: verification codes cannot be hashed and gateway tokens cannot be encrypted.",
    vars: ["APP_ENCRYPTION_KEY"],
  },
  {
    name: "appUrl",
    required: true,
    impact: "Razorpay OAuth redirects and QR links point at the wrong origin.",
    vars: ["NEXT_PUBLIC_APP_URL"],
  },
  {
    name: "email",
    required: true,
    impact: "Signup cannot complete — the verification code is delivered by email.",
    vars: ["RESEND_API_KEY", "EMAIL_FROM"],
  },
  {
    name: "razorpay",
    required: false,
    impact:
      "Restaurants cannot connect a payment account; orders still work as pay-at-counter.",
    vars: ["RAZORPAY_CLIENT_ID", "RAZORPAY_CLIENT_SECRET", "RAZORPAY_WEBHOOK_SECRET"],
  },
  {
    name: "whatsapp",
    required: false,
    impact: "Guest order updates queue as skipped instead of sending.",
    vars: ["WHATSAPP_API_URL", "WHATSAPP_TOKEN", "WHATSAPP_PHONE_ID"],
  },
];

export type GroupStatus = {
  name: string;
  required: boolean;
  configured: boolean;
  missing: string[];
};

/** Presence only — values are never read out of this module. */
export function envStatus(): GroupStatus[] {
  return ENV_GROUPS.map((group) => {
    const missing = group.vars.filter((key) => !process.env[key]);
    return {
      name: group.name,
      required: group.required,
      configured: missing.length === 0,
      missing,
    };
  });
}

export function missingRequired(): string[] {
  return envStatus()
    .filter((group) => group.required && !group.configured)
    .flatMap((group) => group.missing);
}
