CREATE TYPE "public"."spice_level" AS ENUM('none', 'mild', 'medium', 'hot');--> statement-breakpoint
ALTER TABLE "menu_items" ADD COLUMN "is_recommended" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "menu_items" ADD COLUMN "is_bestseller" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "menu_items" ADD COLUMN "spice_level" "spice_level" DEFAULT 'none' NOT NULL;