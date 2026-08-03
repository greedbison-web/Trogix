import "server-only";
import { createHash, createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { OTP } from "./config";

/**
 * Codes are stored as a keyed HMAC, never in plain text.
 *
 * A bare SHA-256 of six digits is worthless — the whole space is a million
 * hashes — so the digest is keyed with a server-side secret derived from
 * APP_ENCRYPTION_KEY. A database leak on its own therefore reveals nothing.
 */
function otpKey(): Buffer {
  const secret = process.env.APP_ENCRYPTION_KEY;
  if (!secret) throw new Error("APP_ENCRYPTION_KEY is not set.");
  // Domain-separated from the AES key that protects gateway tokens.
  return createHmac("sha256", createHash("sha256").update(secret).digest())
    .update("trogix:otp:v1")
    .digest();
}

/** Cryptographically random, uniformly distributed, zero-padded. */
export function generateCode(): string {
  const max = 10 ** OTP.length;
  return String(randomInt(0, max)).padStart(OTP.length, "0");
}

/** The code is bound to the account, so a hash cannot be replayed onto another. */
export function hashCode(code: string, userId: string): string {
  return createHmac("sha256", otpKey())
    .update(`${userId}:${code}`)
    .digest("base64url");
}

/** Constant-time comparison — a timing side channel would leak digits. */
export function codeMatches(
  code: string,
  userId: string,
  storedHash: string | null,
): boolean {
  if (!storedHash) return false;
  const candidate = Buffer.from(hashCode(code, userId));
  const stored = Buffer.from(storedHash);
  if (candidate.length !== stored.length) return false;
  return timingSafeEqual(candidate, stored);
}

export function isCodeShaped(value: string): boolean {
  return new RegExp(`^\\d{${OTP.length}}$`).test(value);
}
