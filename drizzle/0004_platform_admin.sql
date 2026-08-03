CREATE TYPE "public"."admin_role" AS ENUM('owner', 'admin', 'support', 'readonly');--> statement-breakpoint
CREATE TYPE "public"."admin_status" AS ENUM('active', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."log_level" AS ENUM('info', 'warn', 'error');--> statement-breakpoint
CREATE TYPE "public"."notification_level" AS ENUM('info', 'warning', 'critical');--> statement-breakpoint
CREATE TYPE "public"."webhook_status" AS ENUM('received', 'processed', 'failed', 'rejected');--> statement-breakpoint
CREATE TABLE "admin_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid,
	"admin_email" text,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"business_id" uuid,
	"metadata" jsonb,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"percent_off_bps" integer DEFAULT 0 NOT NULL,
	"applies_to_plan" text,
	"max_redemptions" integer,
	"redemptions" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "error_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"level" "log_level" DEFAULT 'error' NOT NULL,
	"source" text NOT NULL,
	"message" text NOT NULL,
	"stack" text,
	"business_id" uuid,
	"context" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "impersonation_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"admin_email" text,
	"business_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "admin_role" DEFAULT 'support' NOT NULL,
	"status" "admin_status" DEFAULT 'active' NOT NULL,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"level" "notification_level" DEFAULT 'info' NOT NULL,
	"business_id" uuid,
	"is_maintenance_banner" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"created_by_email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "platform_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"namespace" text NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"description" text,
	"updated_by_email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qr_scans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"table_id" uuid,
	"table_label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text DEFAULT 'razorpay' NOT NULL,
	"event_id" text,
	"event_type" text,
	"business_id" uuid,
	"provider_order_id" text,
	"signature_valid" boolean DEFAULT false NOT NULL,
	"status" "webhook_status" DEFAULT 'received' NOT NULL,
	"attempts" integer DEFAULT 1 NOT NULL,
	"last_error" text,
	"payload" jsonb NOT NULL,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "trial_ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "plan_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "plan_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "coupon_code" text;--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_admin_id_platform_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."platform_admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_logs" ADD CONSTRAINT "error_logs_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impersonation_sessions" ADD CONSTRAINT "impersonation_sessions_admin_id_platform_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."platform_admins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impersonation_sessions" ADD CONSTRAINT "impersonation_sessions_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_admins" ADD CONSTRAINT "platform_admins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_notifications" ADD CONSTRAINT "platform_notifications_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_scans" ADD CONSTRAINT "qr_scans_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_audit_logs_created_at_idx" ON "admin_audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "admin_audit_logs_admin_id_idx" ON "admin_audit_logs" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "admin_audit_logs_business_id_idx" ON "admin_audit_logs" USING btree ("business_id");--> statement-breakpoint
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons" USING btree ("code");--> statement-breakpoint
CREATE INDEX "error_logs_created_at_idx" ON "error_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "error_logs_level_idx" ON "error_logs" USING btree ("level");--> statement-breakpoint
CREATE INDEX "impersonation_sessions_admin_id_idx" ON "impersonation_sessions" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "impersonation_sessions_business_id_idx" ON "impersonation_sessions" USING btree ("business_id");--> statement-breakpoint
CREATE UNIQUE INDEX "platform_admins_user_id_key" ON "platform_admins" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "platform_notifications_business_id_idx" ON "platform_notifications" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "platform_notifications_published_at_idx" ON "platform_notifications" USING btree ("published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "platform_settings_namespace_key" ON "platform_settings" USING btree ("namespace","key");--> statement-breakpoint
CREATE INDEX "qr_scans_business_id_idx" ON "qr_scans" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "qr_scans_created_at_idx" ON "qr_scans" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "webhook_events_status_idx" ON "webhook_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "webhook_events_created_at_idx" ON "webhook_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "webhook_events_business_id_idx" ON "webhook_events" USING btree ("business_id");--> statement-breakpoint
-- Platform tables belong to Trogix, not to any tenant. Enable RLS with NO
-- policy for `authenticated`, so restaurant sessions can never read them —
-- the admin app reaches them through the service connection only.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'platform_admins','admin_audit_logs','impersonation_sessions',
    'webhook_events','qr_scans','error_logs','platform_notifications',
    'coupons','platform_settings'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP TRIGGER IF EXISTS touch_%1$s ON public.%1$I', t);
    EXECUTE format(
      'CREATE TRIGGER touch_%1$s BEFORE UPDATE ON public.%1$I
       FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at()', t);
  END LOOP;
END $$;

-- A restaurant may read notifications addressed to it (or to everyone).
DROP POLICY IF EXISTS "Members read their notifications" ON public.platform_notifications;
CREATE POLICY "Members read their notifications" ON public.platform_notifications
  FOR SELECT TO authenticated
  USING (business_id IS NULL OR public.is_business_member(business_id));

-- Seed the platform defaults the admin Settings screen edits.
INSERT INTO public.platform_settings (namespace, key, value, description) VALUES
  ('tax','gst_rate_bps','500'::jsonb,'Default GST rate in basis points'),
  ('tax','service_charge_default_bps','0'::jsonb,'Default service charge for new restaurants'),
  ('branding','primary_color','"#111111"'::jsonb,'Default ink for new restaurants'),
  ('branding','accent_color','"#449EB9"'::jsonb,'Default accent for new restaurants'),
  ('branding','support_email','"hello@trogix.co.in"'::jsonb,'Shown to restaurants'),
  ('email','welcome_subject','"Welcome to Trogix"'::jsonb,'Welcome email subject'),
  ('email','welcome_body','"Your restaurant is set up. Add your menu to go live."'::jsonb,'Welcome email body'),
  ('flags','guest_ordering','true'::jsonb,'Master switch for guest ordering'),
  ('flags','kitchen_display','true'::jsonb,'Master switch for the kitchen display'),
  ('flags','analytics','true'::jsonb,'Master switch for restaurant analytics'),
  ('trial','length_days','14'::jsonb,'Trial length for new restaurants')
ON CONFLICT (namespace, key) DO NOTHING;
