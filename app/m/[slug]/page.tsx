import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getVenue,
  getTableByToken,
  getPublicMenu,
} from "@/lib/queries/public-menu";
import { GuestMenu } from "./GuestMenu";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const venue = await getVenue(slug);
    if (venue) {
      return {
        title: venue.name,
        description: `Order from ${venue.name}.`,
        robots: { index: false, follow: false },
      };
    }
  } catch {
    // fall through
  }
  return { title: "Menu", robots: { index: false, follow: false } };
}

export default async function GuestMenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { slug } = await params;
  const { t } = await searchParams;

  let venue = null;
  try {
    venue = await getVenue(slug);
  } catch {
    notFound();
  }
  if (!venue) notFound();

  const [categories, table] = await Promise.all([
    getPublicMenu(venue.businessId),
    getTableByToken(venue.businessId, t),
  ]);

  if (categories.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-6 text-center">
        <h1 className="font-serif text-[2rem] leading-none tracking-[-0.02em]">
          {venue.name}
        </h1>
        <p className="mt-4 max-w-[300px] text-caption leading-relaxed text-ink-500">
          The menu is being updated. Please ask your server.
        </p>
      </div>
    );
  }

  return (
    <GuestMenu
      venue={venue}
      categories={categories}
      table={table}
      tableToken={t ?? null}
    />
  );
}
