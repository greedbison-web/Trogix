import "server-only";
import { createHmac, timingSafeEqual, createHash } from "node:crypto";
import { cookies } from "next/headers";

export const PENDING_COOKIE = "trogix_pending_verification";
const TTL_SECONDS = 60 * 60 * 2;

/**
 * Identifies an account that has signed up but has no session yet.
 *
 * Signed with the server key so the browser cannot point verification at
 * someone else's account. It carries no authority beyond naming which account
 * the verify page is for — every state change still re-reads the database.
 */
function sign(payload: string): string {
  const secret = process.env.APP_ENCRYPTION_KEY;
  if (!secret) throw new Error("APP_ENCRYPTION_KEY is not set.");
  return createHmac("sha256", createHash("sha256").update(secret).digest())
    .update(`trogix:pending:${payload}`)
    .digest("base64url");
}

export async function setPendingUser(userId: string): Promise<void> {
  const expires = Date.now() + TTL_SECONDS * 1000;
  const payload = `${userId}.${expires}`;
  const store = await cookies();
  store.set(PENDING_COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TTL_SECONDS,
  });
}

export async function clearPendingUser(): Promise<void> {
  const store = await cookies();
  store.delete(PENDING_COOKIE);
}

export async function getPendingUser(): Promise<string | null> {
  const raw = (await cookies()).get(PENDING_COOKIE)?.value;
  if (!raw) return null;

  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const [userId, expires, signature] = parts;

  const expected = Buffer.from(sign(`${userId}.${expires}`));
  const provided = Buffer.from(signature);
  if (expected.length !== provided.length) return null;
  if (!timingSafeEqual(expected, provided)) return null;
  if (Number(expires) < Date.now()) return null;

  return userId;
}
