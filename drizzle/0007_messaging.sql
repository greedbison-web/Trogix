CREATE TYPE "public"."message_channel" AS ENUM('whatsapp', 'email', 'browser');--> statement-breakpoint
CREATE TYPE "public"."message_status" AS ENUM('queued', 'sent', 'failed', 'skipped');--> statement-breakpoint
CREATE TABLE "outbound_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"order_id" uuid,
	"channel" "message_channel" NOT NULL,
	"recipient" text NOT NULL,
	"template" text NOT NULL,
	"subject" text,
	"body" text NOT NULL,
	"status" "message_status" DEFAULT 'queued' NOT NULL,
	"attempts" text DEFAULT '0' NOT NULL,
	"last_error" text,
	"provider_message_id" text,
	"metadata" jsonb,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "outbound_messages" ADD CONSTRAINT "outbound_messages_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound_messages" ADD CONSTRAINT "outbound_messages_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "outbound_messages_business_id_idx" ON "outbound_messages" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "outbound_messages_status_idx" ON "outbound_messages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "outbound_messages_order_id_idx" ON "outbound_messages" USING btree ("order_id");--> statement-breakpoint
ALTER TABLE public.outbound_messages ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS touch_outbound_messages ON public.outbound_messages;
CREATE TRIGGER touch_outbound_messages BEFORE UPDATE ON public.outbound_messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP POLICY IF EXISTS "Members manage outbound_messages" ON public.outbound_messages;
CREATE POLICY "Members manage outbound_messages" ON public.outbound_messages
  FOR ALL TO authenticated
  USING (public.is_business_member(business_id))
  WITH CHECK (public.is_business_member(business_id));
