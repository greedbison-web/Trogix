"use client";

import { createBrowserClient } from "@supabase/ssr";
import { requireSupabaseEnv } from "./config";

export function createClient() {
  const { url, anonKey } = requireSupabaseEnv();
  return createBrowserClient(url, anonKey);
}
