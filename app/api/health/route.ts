import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Liveness + database reachability, for uptime checks. */
export async function GET() {
  const started = Date.now();
  let database: "ok" | "unreachable" | "unconfigured" = "unconfigured";

  try {
    const db = getDb();
    await db.execute(sql`select 1`);
    database = "ok";
  } catch (error) {
    database =
      error instanceof Error && /DATABASE_URL/.test(error.message)
        ? "unconfigured"
        : "unreachable";
  }

  const healthy = database !== "unreachable";

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      database,
      latencyMs: Date.now() - started,
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
