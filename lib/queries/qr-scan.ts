import "server-only";
import { getDb, schema } from "@/lib/db";

/** Records a guest QR/NFC open. Best-effort: never blocks or throws. */
export async function recordQrScan(
  businessId: string,
  tableId: string | null,
  tableLabel: string | null,
) {
  try {
    const db = getDb();
    await db.insert(schema.qrScans).values({ businessId, tableId, tableLabel });
  } catch {
    // Monitoring must never affect a guest's ability to order.
  }
}
