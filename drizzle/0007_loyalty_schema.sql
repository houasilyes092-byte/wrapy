DO $$ BEGIN
  CREATE TYPE "public"."loyalty_transaction_type" AS ENUM ('earned', 'redeemed', 'reward_redeemed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."reward_status" AS ENUM ('available', 'redeemed', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."hero_media_type" AS ENUM ('image', 'video');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "loyalty_points_earned" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "loyalty_points_redeemed" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "loyalty_discount" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "loyalty_points_used" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "loyalty_transactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "type" "loyalty_transaction_type" NOT NULL,
  "points" integer NOT NULL,
  "order_id" uuid REFERENCES "orders"("id"),
  "description" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reward_redemptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "product_id" uuid REFERENCES "products"("id"),
  "phone_model" varchar(255) NOT NULL,
  "points_used" integer DEFAULT 300 NOT NULL,
  "status" "reward_status" DEFAULT 'redeemed' NOT NULL,
  "order_id" uuid REFERENCES "orders"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL
);
