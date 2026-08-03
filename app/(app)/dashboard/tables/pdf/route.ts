import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getUser } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/queries/business";
import { getTables } from "@/lib/queries/tables";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const LAYOUTS = {
  /** A4, 2 columns × 3 rows — table tents. */
  tent: { cols: 2, rows: 3, label: "tent" },
  /** A4, 3 columns × 4 rows — compact stickers. */
  sticker: { cols: 3, rows: 4, label: "sticker" },
  /** A4, one per page — posters. */
  poster: { cols: 1, rows: 1, label: "poster" },
} as const;

type LayoutId = keyof typeof LAYOUTS;

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 36;

export async function GET(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorised" }, { status: 401 });

  const record = await getActiveBusiness(user.id);
  if (!record) return NextResponse.json({ error: "no business" }, { status: 404 });

  const url = new URL(request.url);
  const layoutId = (url.searchParams.get("layout") ?? "tent") as LayoutId;
  const layout = LAYOUTS[layoutId] ?? LAYOUTS.tent;
  const only = url.searchParams.get("tables");
  const wanted = only ? new Set(only.split(",")) : null;

  const tables = (await getTables(record.business.id).catch(() => [])).filter(
    (table) => !wanted || wanted.has(table.id),
  );

  if (tables.length === 0) {
    return NextResponse.json({ error: "no tables" }, { status: 400 });
  }

  const origin = url.origin;
  const base = `${origin}/m/${record.business.slug}`;

  const pdf = await PDFDocument.create();
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);

  const cellWidth = (A4.width - MARGIN * 2) / layout.cols;
  const cellHeight = (A4.height - MARGIN * 2) / layout.rows;
  const perPage = layout.cols * layout.rows;

  for (let index = 0; index < tables.length; index += 1) {
    const table = tables[index];
    const slot = index % perPage;
    if (slot === 0) pdf.addPage([A4.width, A4.height]);
    const page = pdf.getPages()[pdf.getPageCount() - 1];

    const col = slot % layout.cols;
    const row = Math.floor(slot / layout.cols);
    const x = MARGIN + col * cellWidth;
    // pdf-lib origin is bottom-left; lay cards out top-to-bottom.
    const y = A4.height - MARGIN - (row + 1) * cellHeight;

    const qrPng = await QRCode.toBuffer(`${base}?t=${table.qrToken}`, {
      width: 600,
      margin: 1,
      color: { dark: "#111111", light: "#FFFFFF" },
    });
    const qrImage = await pdf.embedPng(qrPng);

    const qrSize = Math.min(cellWidth, cellHeight) * (layout.label === "poster" ? 0.5 : 0.52);
    const qrX = x + (cellWidth - qrSize) / 2;
    const qrY = y + cellHeight - qrSize - (layout.label === "poster" ? 150 : 44);

    page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });

    const nameSize = layout.label === "poster" ? 32 : 16;
    const nameWidth = serif.widthOfTextAtSize(record.business.name, nameSize);
    page.drawText(record.business.name, {
      x: x + (cellWidth - nameWidth) / 2,
      y: qrY - nameSize - 12,
      size: nameSize,
      font: serif,
      color: rgb(0.067, 0.067, 0.067),
    });

    const tableLabel = `Table ${table.label}`;
    const tableSize = layout.label === "poster" ? 18 : 11;
    const tableWidth = sans.widthOfTextAtSize(tableLabel, tableSize);
    page.drawText(tableLabel, {
      x: x + (cellWidth - tableWidth) / 2,
      y: qrY - nameSize - 12 - tableSize - 8,
      size: tableSize,
      font: sans,
      color: rgb(0.42, 0.41, 0.39),
    });

    const hint = "Scan to view the menu and order";
    const hintSize = layout.label === "poster" ? 12 : 8;
    const hintWidth = sans.widthOfTextAtSize(hint, hintSize);
    page.drawText(hint, {
      x: x + (cellWidth - hintWidth) / 2,
      y: qrY - nameSize - 12 - tableSize - 8 - hintSize - 10,
      size: hintSize,
      font: sans,
      color: rgb(0.61, 0.6, 0.56),
    });

    // Cut guides on multi-up sheets.
    if (layout.label !== "poster") {
      page.drawRectangle({
        x,
        y,
        width: cellWidth,
        height: cellHeight,
        borderColor: rgb(0.87, 0.85, 0.8),
        borderWidth: 0.5,
      });
    }
  }

  const bytes = await pdf.save();
  const filename = `trogix-qr-${record.business.slug}-${layout.label}.pdf`;

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
