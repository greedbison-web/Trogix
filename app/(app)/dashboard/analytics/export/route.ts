import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getUser } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/queries/business";
import { getAnalytics } from "@/lib/queries/analytics";

/**
 * pdf-lib's standard fonts are WinAnsi-encoded and cannot render the rupee
 * sign, so PDF output uses the ISO currency code and plain digits instead.
 */
function pdfMoney(minor: number, currency: string): string {
  return `${currency} ${(minor / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** RFC 4180 quoting so names with commas or quotes survive a spreadsheet. */
function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csvRows(rows: (string | number)[][]): string {
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

export async function GET(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorised" }, { status: 401 });

  const record = await getActiveBusiness(user.id);
  if (!record) return NextResponse.json({ error: "no business" }, { status: 404 });

  const { business } = record;
  const format = new URL(request.url).searchParams.get("format") ?? "csv";

  const data = await getAnalytics(business.id, business.timezone, 30).catch(() => null);
  if (!data) return NextResponse.json({ error: "unavailable" }, { status: 503 });

  const stamp = new Date().toISOString().slice(0, 10);
  const money = (minor: number) => (minor / 100).toFixed(2);

  if (format === "csv") {
    const sections: string[] = [];

    sections.push(`Trogix analytics,${business.name},${stamp}`);
    sections.push("");
    sections.push("Summary");
    sections.push(
      csvRows([
        ["Metric", `Value (${business.currency})`],
        ["Revenue today", money(data.today.revenue)],
        ["Orders today", data.today.orders],
        [`Revenue last ${data.days} days`, money(data.period.revenue)],
        [`Orders last ${data.days} days`, data.period.orders],
        ["Average order", money(data.period.average)],
      ]),
    );

    sections.push("");
    sections.push("Daily revenue");
    sections.push(
      csvRows([
        ["Date", "Orders", `Revenue (${business.currency})`],
        ...data.series.map((d) => [d.day, d.orders, money(d.revenue)]),
      ]),
    );

    sections.push("");
    sections.push("Best sellers");
    sections.push(
      csvRows([
        ["Item", "Quantity", `Revenue (${business.currency})`],
        ...data.topItems.map((i) => [i.name, i.quantity, money(i.revenue)]),
      ]),
    );

    sections.push("");
    sections.push("Peak hours");
    sections.push(
      csvRows([
        ["Hour", "Orders", `Revenue (${business.currency})`],
        ...data.peakHours.map((h) => [
          `${String(h.hour).padStart(2, "0")}:00`,
          h.orders,
          money(h.revenue),
        ]),
      ]),
    );

    sections.push("");
    sections.push("Table utilisation");
    sections.push(
      csvRows([
        ["Table", "Orders", `Revenue (${business.currency})`],
        ...data.tableUse.map((t) => [t.label, t.orders, money(t.revenue)]),
      ]),
    );

    sections.push("");
    sections.push("Repeat customers");
    sections.push(
      csvRows([
        ["Identified guests", data.repeat.guests],
        ["Repeat guests", data.repeat.repeatGuests],
        ["Total visits", data.repeat.totalVisits],
      ]),
    );

    // BOM so Excel reads UTF-8 (the ₹ sign) correctly.
    const body = `﻿${sections.join("\n")}`;
    return new NextResponse(body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="trogix-analytics-${business.slug}-${stamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const pdf = await PDFDocument.create();
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([595.28, 841.89]);
  let y = 780;

  const ink = rgb(0.067, 0.067, 0.067);
  const muted = rgb(0.42, 0.41, 0.39);

  const line = (
    text: string,
    size = 10,
    font = sans,
    color = ink,
    indent = 0,
  ) => {
    if (y < 60) {
      page = pdf.addPage([595.28, 841.89]);
      y = 780;
    }
    // Defensive: standard PDF fonts are WinAnsi-only.
    page.drawText(text.replace(/[^\x20-\xFF]/g, ""), {
      x: 48 + indent,
      y,
      size,
      font,
      color,
    });
    y -= size + 6;
  };

  const heading = (text: string) => {
    y -= 10;
    line(text, 12, bold, ink);
    y -= 2;
  };

  page.drawText(business.name, { x: 48, y, size: 24, font: serif, color: ink });
  y -= 30;
  line(`Analytics · last ${data.days} days · generated ${stamp}`, 10, sans, muted);

  heading("Summary");
  line(`Revenue today: ${pdfMoney(data.today.revenue, business.currency)}`);
  line(`Orders today: ${data.today.orders}`);
  line(`Revenue (${data.days}d): ${pdfMoney(data.period.revenue, business.currency)}`);
  line(`Orders (${data.days}d): ${data.period.orders}`);
  line(`Average order: ${pdfMoney(data.period.average, business.currency)}`);

  heading("Best sellers");
  if (data.topItems.length === 0) line("No sales yet.", 10, sans, muted);
  for (const item of data.topItems) {
    line(
      `${item.name} — ${item.quantity} sold, ${pdfMoney(item.revenue, business.currency)}`,
    );
  }

  heading("Peak hours");
  if (data.peakHours.length === 0) line("No completed orders yet.", 10, sans, muted);
  for (const hour of data.peakHours) {
    line(`${String(hour.hour).padStart(2, "0")}:00 — ${hour.orders} orders`);
  }

  heading("Table utilisation");
  if (data.tableUse.length === 0) line("No tables yet.", 10, sans, muted);
  for (const table of data.tableUse) {
    line(
      `Table ${table.label} — ${table.orders} orders, ${pdfMoney(table.revenue, business.currency)}`,
    );
  }

  heading("Repeat customers");
  line(
    `${data.repeat.repeatGuests} of ${data.repeat.guests} identified guests ordered more than once.`,
  );

  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="trogix-analytics-${business.slug}-${stamp}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
