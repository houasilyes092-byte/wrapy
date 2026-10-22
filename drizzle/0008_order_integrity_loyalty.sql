-- Order integrity, guest confirmation access, and lifecycle-based loyalty.
-- Additive only: no data is modified or deleted.

ALTER TYPE "public"."loyalty_transaction_type" ADD VALUE IF NOT EXISTS 'reversed';
--> statement-breakpoint
ALTER TYPE "public"."loyalty_transaction_type" ADD VALUE IF NOT EXISTS 'refunded';
--> statement-breakpoint
ALTER TYPE "public"."reward_status" ADD VALUE IF NOT EXISTS 'cancelled';
--> statement-breakpoint
-- Existing orders keep NULL ("legacy": points were already granted at creation
-- by the previous logic, so lifecycle loyalty must never touch them).
ALTER TABLE "orders" ADD COLUMN "loyalty_points_awarded" integer;
--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "loyalty_points_awarded" SET DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "access_token_hash" varchar(64);
--> statement-breakpoint
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_order_id_unique" UNIQUE ("order_id");
