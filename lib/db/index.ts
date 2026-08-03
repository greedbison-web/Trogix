import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let cached: ReturnType<typeof drizzle<typeof schema>> | null = null;

/** Lazy singleton — never connects at build time. */
export function getDb() {
  if (cached) return cached;

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");

  // More than one connection: a transaction holds a connection for its whole
  // life, so any concurrent request (or a nested read) would otherwise block
  // behind it. Kept small because serverless instances multiply the pool.
  const client = postgres(url, {
    prepare: false,
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  cached = drizzle(client, { schema });
  return cached;
}

export { schema };
