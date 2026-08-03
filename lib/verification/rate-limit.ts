import "server-only";
import { sql } from "drizzle-orm";
import { headers } from "next/headers";
import { getDb } from "@/lib/db";

export type LimitVerdict = { allowed: boolean; retryAfterSeconds: number };

/**
 * Fixed-window counter held in Postgres.
 *
 * A single statement does the whole thing: insert the window, or bump it —
 * resetting first when the stored window has aged out. Doing it in one
 * round trip means two concurrent requests cannot both read a stale count and
 * both decide they are under the limit.
 */
export async function consume(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<LimitVerdict> {
  let count: number;
  let windowStartedAt: Date;

  try {
    const db = getDb();
    const rows = await db.execute<{ count: number; window_started_at: Date }>(sql`
      insert into rate_limits (key, count, window_started_at)
      values (${key}, 1, now())
      on conflict (key) do update set
        count = case
          when rate_limits.window_started_at < now() - make_interval(secs => ${windowSeconds})
          then 1
          else rate_limits.count + 1
        end,
        window_started_at = case
          when rate_limits.window_started_at < now() - make_interval(secs => ${windowSeconds})
          then now()
          else rate_limits.window_started_at
        end
      returning count, window_started_at
    `);
    const row = rows[0];
    if (!row) return { allowed: true, retryAfterSeconds: 0 };
    count = Number(row.count);
    windowStartedAt = new Date(row.window_started_at);
  } catch {
    // A limiter that cannot reach its store must not lock everyone out.
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (count <= limit) return { allowed: true, retryAfterSeconds: 0 };

  const elapsed = (Date.now() - windowStartedAt.getTime()) / 1000;
  return {
    allowed: false,
    retryAfterSeconds: Math.max(1, Math.ceil(windowSeconds - elapsed)),
  };
}

/**
 * Caller address. Trusts the proxy headers Vercel and most edges set; falls
 * back to a constant so the limiter still applies a global ceiling when the
 * address is genuinely unknown.
 */
export async function clientIp(): Promise<string> {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    if (forwarded) {
      const first = forwarded.split(",")[0]?.trim();
      if (first) return first;
    }
    return h.get("x-real-ip") ?? h.get("cf-connecting-ip") ?? "unknown";
  } catch {
    // No request context (a scheduled job, a script). The limiter still
    // applies, keyed to the shared "unknown" bucket.
    return "unknown";
  }
}

export async function clientUserAgent(): Promise<string | null> {
  try {
    return (await headers()).get("user-agent");
  } catch {
    return null;
  }
}

/** Human phrasing for a retry delay. */
export function retryPhrase(seconds: number): string {
  if (seconds < 60) return `${seconds} second${seconds === 1 ? "" : "s"}`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}
