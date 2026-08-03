CREATE TYPE "public"."payment_account_status" AS ENUM('disconnected', 'connected', 'expired', 'revoked');--> statement-breakpoint
ALTER TYPE "public"."order_status" ADD VALUE 'awaiting_payment' BEFORE 'placed';--> statement-breakpoint
CREATE TABLE "payment_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"provider" text DEFAULT 'razorpay' NOT NULL,
	"status" "payment_account_status" DEFAULT 'disconnected' NOT NULL,
	"account_id" text,
	"account_name" text,
	"account_email" text,
	"public_key" text,
	"access_token_enc" text,
	"refresh_token_enc" text,
	"token_expires_at" timestamp with time zone,
	"live_mode" boolean DEFAULT false NOT NULL,
	"connected_at" timestamp with time zone,
	"last_error_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "account_id" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "provider_event_id" text;--> statement-breakpoint
ALTER TABLE "payment_accounts" ADD CONSTRAINT "payment_accounts_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_accounts_business_provider_key" ON "payment_accounts" USING btree ("business_id","provider");--> statement-breakpoint
CREATE INDEX "payment_accounts_account_id_idx" ON "payment_accounts" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_provider_order_id_key" ON "payments" USING btree ("provider_order_id");--> statement-breakpoint
-- Trigger + RLS for the new table, matching every other tenant-owned table.
DROP TRIGGER IF EXISTS touch_payment_accounts ON public.payment_accounts;
CREATE TRIGGER touch_payment_accounts BEFORE UPDATE ON public.payment_accounts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.payment_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members manage payment_accounts" ON public.payment_accounts;
CREATE POLICY "Members manage payment_accounts" ON public.payment_accounts
  FOR ALL TO authenticated
  USING (public.is_business_member(business_id))
  WITH CHECK (public.is_business_member(business_id));
