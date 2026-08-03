"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { isUniqueViolation } from "@/lib/db/errors";
import { createClient, getUser } from "@/lib/supabase/server";
import { businessSchema, slugify } from "@/lib/validation/business";
import { isVerified } from "@/lib/verification/service";
import type { OnboardingState } from "./state";

const LOGO_BUCKET = "business-logos";
const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

/** Returns the owner's business, or null. Safe when DB is unconfigured. */
export async function getOwnedBusiness(ownerId: string) {
  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(schema.businesses)
      .where(
        and(
          eq(schema.businesses.ownerId, ownerId),
          isNull(schema.businesses.deletedAt),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function isSlugAvailable(slug: string): Promise<boolean> {
  const normalized = slugify(slug);
  if (!normalized) return false;
  try {
    const db = getDb();
    const rows = await db
      .select({ id: schema.businesses.id })
      .from(schema.businesses)
      .where(eq(schema.businesses.slug, normalized))
      .limit(1);
    return rows.length === 0;
  } catch {
    return true;
  }
}

async function uploadLogo(file: File, ownerId: string): Promise<string | null> {
  if (!file || file.size === 0) return null;
  if (file.size > MAX_LOGO_BYTES) throw new Error("Logo must be under 2 MB.");
  if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
    throw new Error("Logo must be a PNG, JPG, WebP or SVG.");
  }

  const supabase = await createClient();
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const path = `${ownerId}/${Date.now()}.${extension}`;

  const { error } = await supabase.storage
    .from(LOGO_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: true });

  if (error) throw new Error("Could not upload the logo. Try again.");

  const { data } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function createBusiness(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const user = await getUser();
  if (!user) redirect("/login?next=/onboarding");

  // Re-checked here rather than trusting the layout: a business must never
  // enter approval review on contact details nobody proved.
  if (!(await isVerified(user.id))) redirect("/verify");

  const parsed = businessSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    ownerName: formData.get("ownerName"),
    phone: formData.get("phone"),
    gst: formData.get("gst") ?? "",
    addressLine: formData.get("addressLine"),
    city: formData.get("city"),
    state: formData.get("state"),
    pincode: formData.get("pincode"),
    slug: formData.get("slug"),
    timezone: formData.get("timezone") || "Asia/Kolkata",
    currency: formData.get("currency") || "INR",
  });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!errors[key]) errors[key] = issue.message;
    }
    return { errors, message: "Please fix the highlighted fields." };
  }

  const values = parsed.data;

  let db: ReturnType<typeof getDb>;
  try {
    db = getDb();
  } catch {
    return { errors: {}, message: "Database is not configured yet." };
  }

  // One business per owner for now.
  const existing = await getOwnedBusiness(user.id);
  if (existing) redirect("/dashboard");

  if (!(await isSlugAvailable(values.slug))) {
    return {
      errors: { slug: "That link is already taken." },
      message: "Please fix the highlighted fields.",
    };
  }

  let logoUrl: string | null = null;
  const logo = formData.get("logo");
  if (logo instanceof File) {
    try {
      logoUrl = await uploadLogo(logo, user.id);
    } catch (error) {
      return {
        errors: { logo: error instanceof Error ? error.message : "Upload failed." },
        message: "Please fix the highlighted fields.",
      };
    }
  }

  try {
    await db.transaction(async (tx) => {
      // Mirror row may not exist yet if the auth trigger has not been applied.
      await tx
        .insert(schema.users)
        .values({
          id: user.id,
          email: user.email ?? "",
          fullName: values.ownerName,
        })
        .onConflictDoNothing();

      const [created] = await tx
        .insert(schema.businesses)
        .values({
          ownerId: user.id,
          name: values.name,
          slug: values.slug,
          type: values.type,
          ownerName: values.ownerName,
          phone: values.phone,
          gst: values.gst ?? null,
          addressLine: values.addressLine,
          city: values.city,
          state: values.state,
          pincode: values.pincode,
          logoUrl,
          timezone: values.timezone,
          currency: values.currency,
        })
        .returning({ id: schema.businesses.id });

      await tx.insert(schema.businessSettings).values({
        businessId: created.id,
        logoUrl,
        currency: values.currency,
        timezone: values.timezone,
        gstNumber: values.gst ?? null,
        contactEmail: user.email ?? null,
        contactPhone: values.phone,
        businessStatus: "pending_review",
        submittedForReviewAt: new Date(),
      });

      await tx.insert(schema.staffMembers).values({
        businessId: created.id,
        userId: user.id,
        name: values.ownerName,
        email: user.email ?? null,
        phone: values.phone,
        role: "owner",
        status: "active",
      });
    });
  } catch (error) {
    const duplicate = isUniqueViolation(error);
    return {
      errors: duplicate ? { slug: "That link is already taken." } : {},
      message: duplicate
        ? "Please fix the highlighted fields."
        : "Could not create your business. Try again.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/onboarding/payments");
}
