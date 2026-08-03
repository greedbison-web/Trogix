CREATE TABLE "item_addons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"menu_item_id" uuid NOT NULL,
	"name" text NOT NULL,
	"price" integer DEFAULT 0 NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "operating_hours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"weekday" integer NOT NULL,
	"is_open" boolean DEFAULT true NOT NULL,
	"opens_at" text DEFAULT '11:00' NOT NULL,
	"closes_at" text DEFAULT '23:00' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "menu_items" ADD COLUMN "available_from" text;--> statement-breakpoint
ALTER TABLE "menu_items" ADD COLUMN "available_until" text;--> statement-breakpoint
ALTER TABLE "menu_items" ADD COLUMN "available_days" integer;--> statement-breakpoint
ALTER TABLE "item_addons" ADD CONSTRAINT "item_addons_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_addons" ADD CONSTRAINT "item_addons_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operating_hours" ADD CONSTRAINT "operating_hours_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "item_addons_business_id_idx" ON "item_addons" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "item_addons_menu_item_id_idx" ON "item_addons" USING btree ("menu_item_id");--> statement-breakpoint
CREATE INDEX "operating_hours_business_id_idx" ON "operating_hours" USING btree ("business_id");--> statement-breakpoint
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['operating_hours','item_addons']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP TRIGGER IF EXISTS touch_%1$s ON public.%1$I', t);
    EXECUTE format(
      'CREATE TRIGGER touch_%1$s BEFORE UPDATE ON public.%1$I
       FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at()', t);
    EXECUTE format('DROP POLICY IF EXISTS "Members manage %1$s" ON public.%1$I', t);
    EXECUTE format(
      'CREATE POLICY "Members manage %1$s" ON public.%1$I
         FOR ALL TO authenticated
         USING (public.is_business_member(business_id))
         WITH CHECK (public.is_business_member(business_id))', t);
  END LOOP;
END $$;
