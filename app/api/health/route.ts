import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { envStatus, missingRequired } from "@/lib/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Liveness, database reachability and configuration readiness.
 *
 * Reports which configuration groups are present, never any value, so a fresh
 * deployment can be checked from a browser without leaking a secret.
 */
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

  const groups = envStatus();
  const missing = missingRequired();
  const healthy = database !== "unreachable";

  return NextResponse.json(
    {
      status: healthy && missing.length === 0 ? "ok" : "degraded",
      database,
      configuration: {
        ready: missing.length === 0,
        missingRequired: missing,
        groups: groups.map((group) => ({
          name: group.name,
          required: group.required,
          configured: group.configured,
        })),
      },
      latencyMs: Date.now() - started,
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
