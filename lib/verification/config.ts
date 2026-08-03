/**
 * Verification policy. Every window and ceiling lives here so the server, the
 * UI copy and the tests all quote the same numbers.
 */
export const OTP = {
  /** Digits in the code. */
  length: 6,
  /** How long a freshly issued code stays usable. */
  ttlSeconds: 5 * 60,
  /** Wrong guesses allowed before the code is destroyed. */
  maxAttempts: 5,
  /** Resends allowed per account before generation is blocked. */
  maxResends: 5,
  /** Minimum gap between sends. */
  resendCooldownSeconds: 60,
  /** How long generation stays blocked once the resend ceiling is hit. */
  blockMinutes: 60,
} as const;

/** Per-IP ceilings, independent of which account is targeted. */
export const IP_LIMITS = {
  /** Code requests (signup + resend) per window. */
  request: { limit: 10, windowSeconds: 15 * 60 },
  /** Code submissions per window. */
  attempt: { limit: 30, windowSeconds: 15 * 60 },
  /** Signups per window. */
  signup: { limit: 5, windowSeconds: 60 * 60 },
} as const;
