import { redirect } from "next/navigation";
import { headers } from "next/headers";
import QRCode from "qrcode";
import type { Metadata } from "next";
import { getUser } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/queries/business";
import { getTables } from "@/lib/queries/tables";

export const metadata: Metadata = { title: "Print QR codes" };

export default async function PrintPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const record = await getActiveBusiness(user.id);
  if (!record) redirect("/onboarding");

  const tables = await getTables(record.business.id).catch(() => []);
  const host = (await headers()).get("host") ?? "trogix.co.in";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const base = `${protocol}://${host}/m/${record.business.slug}`;

  const cards = await Promise.all(
    tables.map(async (table) => ({
      label: table.label,
      dataUrl: await QRCode.toDataURL(`${base}?t=${table.qrToken}`, {
        width: 600,
        margin: 1,
        color: { dark: "#111111", light: "#FFFFFF" },
      }),
    })),
  );

  return (
    <div className="mx-auto max-w-[1180px] px-6 py-10">
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="break-inside-avoid rounded-2xl border border-paper-edge bg-white p-6 text-center"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={card.dataUrl} alt="" className="mx-auto w-full max-w-[220px]" />
            <p className="mt-4 font-serif text-[1.75rem] leading-none">
              {record.business.name}
            </p>
            <p className="mt-2 text-caption text-ink-500">Table {card.label}</p>
            <p className="mt-3 text-micro text-ink-300">Scan to view the menu</p>
          </div>
        ))}
      </div>
    </div>
  );
}
