export type TemplateId =
  | "order_confirmed"
  | "order_ready"
  | "order_completed"
  | "payment_failed";

type Context = {
  businessName: string;
  orderNumber: number;
  tableLabel?: string | null;
  total?: string;
  guestName?: string | null;
};

/** Guest-facing copy. Kept in one place so tone stays consistent. */
export function renderTemplate(
  template: TemplateId,
  ctx: Context,
): { subject: string; body: string } {
  const who = ctx.guestName ? `${ctx.guestName}, ` : "";
  const where = ctx.tableLabel ? ` at table ${ctx.tableLabel}` : "";

  switch (template) {
    case "order_confirmed":
      return {
        subject: `${ctx.businessName} — order #${ctx.orderNumber} confirmed`,
        body: `${who}your order #${ctx.orderNumber}${where} is confirmed and with the kitchen.${
          ctx.total ? ` Total ${ctx.total}.` : ""
        }`,
      };
    case "order_ready":
      return {
        subject: `${ctx.businessName} — order #${ctx.orderNumber} is ready`,
        body: `${who}your order #${ctx.orderNumber} is ready.`,
      };
    case "order_completed":
      return {
        subject: `${ctx.businessName} — thank you`,
        body: `${who}thank you for dining with ${ctx.businessName}. Your receipt for order #${ctx.orderNumber} is on its way.`,
      };
    case "payment_failed":
      return {
        subject: `${ctx.businessName} — payment could not be completed`,
        body: `${who}the payment for order #${ctx.orderNumber} did not go through. You can try again from the menu, or speak to your server.`,
      };
  }
}
