import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { requireSupabaseEnv } from "./config";
import { isPreview } from "@/lib/preview/mode";
import { PREVIEW_EMAIL, PREVIEW_USER_ID } from "@/lib/preview/data";

/** The stand-in owner preview mode signs in as. */
const previewUser = {
  id: PREVIEW_USER_ID,
  email: PREVIEW_EMAIL,
  aud: "authenticated",
  role: "authenticated",
  app_metadata: { provider: "preview" },
  user_metadata: { full_name: "Preview Owner" },
  created_at: new Date(0).toISOString(),
} as unknown as User;

export async function createClient() {
  const { url, anonKey } = requireSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component — middleware refreshes the session.
        }
      },
    },
  });
}

/** Current user, or null. Never throws when Supabase is unconfigured. */
export async function getUser() {
  if (isPreview()) return previewUser;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}
