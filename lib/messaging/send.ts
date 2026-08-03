import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { renderTemplate, type TemplateId } from "./templates";

export type Channel = "whatsapp" | "email" | "browser";

function providerConfigured(channel: Channel) {
  if (channel === "whatsapp") {
    return Boolean(
      process.env.WHATSAPP_API_URL &&
        process.env.WHATSAPP_TOKEN &&
        process.env.WHATSAPP_PHONE_ID,
    );
  }
  if (channel === "email") {
    return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
  }
  return false;
}

async function deliverWhatsApp(to: string, body: string) {
  const response = await fetch(
    `${process.env.WHATSAPP_API_URL}/${process.env.WHATSAPP_PHONE_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body },
      }),
      cache: "no-store",
    },
  );
  if (!response.ok) throw new Error(`WhatsApp ${response.status}`);
  const json = (await response.json()) as { messages?: { id?: string }[] };
  return json.messages?.[0]?.id ?? null;
}

async function deliverEmail(to: string, subject: string, body: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      text: body,
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Email ${response.status}`);
  const json = (await response.json()) as { id?: string };
  return json.id ?? null;
}

/**
 * Queues a guest message and attempts delivery immediately.
 *
 * The row is written first, so an unconfigured or failing provider leaves a
 * durable record that can be retried rather than dropping the message. Never
 * throws — messaging must not break an order.
 */
export async function queueMessage(input: {
  businessId: string;
  orderId?: string | null;
  channel: Channel;
  recipient: string | null | undefined;
  template: TemplateId;
  context: Parameters<typeof renderTemplate>[1];
}): Promise<void> {
  if (!input.recipient) return;

  const { subject, body } = renderTemplate(input.template, input.context);
  const configured = providerConfigured(input.channel);

  let messageId: string | null = null;
  try {
    const db = getDb();
    const [row] = await db
      .insert(schema.outboundMessages)
      .values({
        businessId: input.businessId,
        orderId: input.orderId ?? null,
        channel: input.channel,
        recipient: input.recipient,
        template: input.template,
        subject,
        body,
        status: configured ? "queued" : "skipped",
        lastError: configured ? null : "Provider not configured.",
      })
      .returning({ id: schema.outboundMessages.id });
    messageId = row.id;
  } catch {
    return;
  }

  if (!configured || !messageId) return;

  try {
    const providerId =
      input.channel === "whatsapp"
        ? await deliverWhatsApp(input.recipient, body)
        : input.channel === "email"
          ? await deliverEmail(input.recipient, subject, body)
          : null;

    const db = getDb();
    await db
      .update(schema.outboundMessages)
      .set({
        status: "sent",
        sentAt: new Date(),
        providerMessageId: providerId,
        attempts: "1",
      })
      .where(eq(schema.outboundMessages.id, messageId));
  } catch (error) {
    try {
      const db = getDb();
      await db
        .update(schema.outboundMessages)
        .set({
          status: "failed",
          attempts: "1",
          lastError: error instanceof Error ? error.message : "Delivery failed.",
        })
        .where(eq(schema.outboundMessages.id, messageId));
    } catch {
      // Nothing further to record.
    }
  }
}
