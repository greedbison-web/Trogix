/** GST on restaurant service in India. Kept in one place. */
export const GST_RATE_BPS = 500;

export type CartLine = {
  itemId: string;
  variantId: string | null;
  quantity: number;
};

export type PricedLine = CartLine & {
  name: string;
  variantName: string | null;
  unitPrice: number;
  lineTotal: number;
};

export function priceOrder(
  lines: PricedLine[],
  options: { serviceChargeBps: number; taxEnabled: boolean },
) {
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const serviceChargeAmount = Math.round(
    (subtotal * options.serviceChargeBps) / 10_000,
  );
  const taxable = subtotal + serviceChargeAmount;
  const taxAmount = options.taxEnabled
    ? Math.round((taxable * GST_RATE_BPS) / 10_000)
    : 0;
  return {
    subtotal,
    serviceChargeAmount,
    taxAmount,
    total: taxable + taxAmount,
  };
}
