"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/supabase/server";
import { getBusinessForOwner } from "@/lib/queries/business";
import { disconnect } from "@/lib/razorpay/oauth";
import type { ActionResult } from "../menu/types";

export async function disconnectRazorpay(): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, errors: {}, message: "Sign in again." };

  const record = await getBusinessForOwner(user.id);
  if (!record) return { ok: false, errors: {}, message: "No business found." };

  try {
    await disconnect(record.business.id);
  } catch {
    return { ok: false, errors: {}, message: "Could not disconnect." };
  }

  revalidatePath("/dashboard/payments");
  return { ok: true, errors: {}, message: null };
}
