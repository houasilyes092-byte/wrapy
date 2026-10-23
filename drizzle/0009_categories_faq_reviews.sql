-- Category ordering/featuring, FAQ storage, review moderation status.
-- Additive only: existing rows keep their data; new columns get safe defaults.

ALTER TABLE "collections" ADD COLUMN IF NOT EXISTS "is_featured" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "collections" ADD COLUMN IF NOT EXISTS "sort_order" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "faq_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" varchar(100) NOT NULL,
	"question" varchar(300) NOT NULL,
	"answer" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "faq_items" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
-- pending -> approved | rejected. is_approved stays the public flag and is kept
-- equal to (status = 'approved') by the admin API.
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "status" varchar(20) DEFAULT 'pending' NOT NULL;
--> statement-breakpoint
UPDATE "reviews" SET "status" = 'approved' WHERE "is_approved" = true AND "status" = 'pending';
--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_status_check" CHECK ("status" IN ('pending', 'approved', 'rejected'));
