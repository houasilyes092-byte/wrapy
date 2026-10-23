-- Wrapy: migrate the production database to the deployed app's schema.
--
-- TARGET: Supabase project ezfeecnznevihzqnsfsd only.
--
-- WHY: the production tables were created by a different Wrapy codebase
-- (integer ids, numeric TND prices, first/last names, site_settings, ...).
-- The deployed app needs uuid ids, integer millimes and its own tables, so the
-- existing tables cannot be adapted in place.
--
-- WHAT, in ONE transaction (any failure = nothing changes):
--   1. Moves the 17 existing tables and their 2 enum types, UNCHANGED, into
--      schema wrapy_legacy (not exposed to the Data API). They stay as an
--      in-database backup; nothing is dropped or deleted.
--   2. Creates the app schema in public from drizzle/0000-0008 (0002 without
--      its review data changes), plus collections.images.
--   3. Copies all data: integer ids -> uuid (mapping kept in
--      wrapy_legacy.id_map), TND -> millimes (x1000), first+last -> name,
--      collection image_url -> images[], order numbers appended to notes,
--      'processing' -> 'preparing'. Existing orders are marked legacy for
--      loyalty (never re-awarded); balances are copied unchanged.
--      The signed logo URL is NOT copied (next/image rejects signed URLs and
--      would break every page); it remains in wrapy_legacy.site_settings.
--   4. Enables RLS (no policies) on every new table, as on the old ones.
--   5. Verifies row counts and money totals against the legacy tables, and
--      the full app schema (116 columns).
--
-- ROLLBACK (manual, only if ever needed): see rollback-legacy-schema.sql.

BEGIN;

-- 0. PREFLIGHT: refuse to run twice or against an unexpected database ----------
DO $$ BEGIN
  IF to_regnamespace('wrapy_legacy') IS NOT NULL THEN
    RAISE EXCEPTION 'Not applied, nothing changed: schema wrapy_legacy already exists (migration already run?)';
  END IF;
  IF (SELECT format_type(atttypid, atttypmod) FROM pg_attribute
      WHERE attrelid = 'public.users'::regclass AND attname = 'id') <> 'integer'
     OR NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'public.users'::regclass AND attname = 'first_name')
     OR to_regclass('public.site_settings') IS NULL OR to_regclass('public.settings') IS NOT NULL THEN
    RAISE EXCEPTION 'Not applied, nothing changed: public schema is not the expected legacy layout';
  END IF;
END $$;

-- 1. MOVE THE LEGACY TABLES (unchanged) ----------------------------------------
CREATE SCHEMA wrapy_legacy;
REVOKE ALL ON SCHEMA wrapy_legacy FROM PUBLIC, anon, authenticated;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['addresses','cart_items','collections','content_pages','faqs','homepage_sections',
    'loyalty_history','marketing_settings','media_assets','newsletter_subscribers','order_items','orders',
    'products','promo_codes','reviews','site_settings','users'] LOOP
    EXECUTE format('ALTER TABLE public.%I SET SCHEMA wrapy_legacy', t);
  END LOOP;
END $$;
ALTER TYPE public.order_status SET SCHEMA wrapy_legacy;
ALTER TYPE public.user_role SET SCHEMA wrapy_legacy;

-- 2. APP SCHEMA FROM THE REPOSITORY MIGRATIONS ----------------------------------
-- ---- drizzle/0000_youthful_salo (baseline) ----
CREATE TYPE "public"."coupon_type" AS ENUM('percentage', 'fixed');
CREATE TYPE "public"."order_status" AS ENUM('pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled');
CREATE TYPE "public"."payment_method" AS ENUM('cash_on_delivery');
CREATE TYPE "public"."user_role" AS ENUM('customer', 'admin');
CREATE TABLE "coupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(100) NOT NULL,
	"type" "coupon_type" NOT NULL,
	"value" integer NOT NULL,
	"max_uses" integer,
	"used_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "coupons_code_unique" UNIQUE("code")
);

CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"price" integer NOT NULL,
	"compare_price" integer,
	"images" json DEFAULT '[]'::json NOT NULL,
	"compatible_models" json DEFAULT '[]'::json NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"collection_id" uuid,
	"tags" json DEFAULT '[]'::json NOT NULL,
	"is_best_seller" boolean DEFAULT false NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);

CREATE TABLE "collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"image" varchar(500),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "collections_slug_unique" UNIQUE("slug")
);

CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"customer_name" varchar(255) NOT NULL,
	"phone" varchar(50) NOT NULL,
	"email" varchar(255),
	"address" text NOT NULL,
	"city" varchar(255) NOT NULL,
	"postal_code" varchar(20),
	"notes" text,
	"subtotal" integer NOT NULL,
	"shipping_price" integer NOT NULL,
	"discount" integer DEFAULT 0 NOT NULL,
	"total" integer NOT NULL,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"payment_method" "payment_method" DEFAULT 'cash_on_delivery' NOT NULL,
	"coupon_code" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid,
	"product_name" varchar(255) NOT NULL,
	"product_image" varchar(500),
	"phone_model" varchar(255),
	"quantity" integer NOT NULL,
	"price" integer NOT NULL,
	"total" integer NOT NULL
);

CREATE TABLE "settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(255) NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "settings_key_unique" UNIQUE("key")
);

CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(50),
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'customer' NOT NULL,
	"loyalty_points" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);

CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"user_id" uuid,
	"customer_name" varchar(255),
	"rating" integer NOT NULL,
	"comment" text,
	"is_approved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "wishlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "products" ADD CONSTRAINT "products_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "wishlist" ADD CONSTRAINT "wishlist_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "wishlist" ADD CONSTRAINT "wishlist_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

-- ---- drizzle/0001_old_onslaught ----
CREATE TABLE "phone_models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "phone_models_name_unique" UNIQUE("name")
);

-- ---- drizzle/0002_customer_features (DDL only; its review UPDATEs are NOT applied) ----
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "made_to_order" boolean DEFAULT false NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" varchar(500);
CREATE UNIQUE INDEX IF NOT EXISTS "reviews_user_product_unique" ON "reviews" ("user_id", "product_id");

-- ---- drizzle/0003_orders_idempotency_key ----
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "idempotency_key" varchar(100);
CREATE UNIQUE INDEX IF NOT EXISTS "orders_idempotency_key_unique" ON "orders" ("idempotency_key");

-- ---- drizzle/0004_reviews_title ----
-- Add title field to reviews table
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "title" VARCHAR(255);

-- ---- drizzle/0005_reviews_is_homepage ----
-- Add is_homepage field to reviews table
ALTER TABLE "reviews" ADD COLUMN "is_homepage" BOOLEAN NOT NULL DEFAULT FALSE;

-- ---- drizzle/0006_products_soft_delete ----
ALTER TABLE "products"
ADD COLUMN IF NOT EXISTS "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE;

-- ---- drizzle/0007_loyalty_schema ----
DO $$ BEGIN
  CREATE TYPE "public"."loyalty_transaction_type" AS ENUM ('earned', 'redeemed', 'reward_redeemed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."reward_status" AS ENUM ('available', 'redeemed', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."hero_media_type" AS ENUM ('image', 'video');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "loyalty_points_earned" integer DEFAULT 0 NOT NULL;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "loyalty_points_redeemed" integer DEFAULT 0 NOT NULL;

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "loyalty_discount" integer DEFAULT 0 NOT NULL;

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "loyalty_points_used" integer DEFAULT 0 NOT NULL;

CREATE TABLE IF NOT EXISTS "loyalty_transactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "type" "loyalty_transaction_type" NOT NULL,
  "points" integer NOT NULL,
  "order_id" uuid REFERENCES "orders"("id"),
  "description" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

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

-- ---- drizzle/0008_order_integrity_loyalty ----
-- Order integrity, guest confirmation access, and lifecycle-based loyalty.
-- Additive only: no data is modified or deleted.

ALTER TYPE "public"."loyalty_transaction_type" ADD VALUE IF NOT EXISTS 'reversed';

ALTER TYPE "public"."loyalty_transaction_type" ADD VALUE IF NOT EXISTS 'refunded';

ALTER TYPE "public"."reward_status" ADD VALUE IF NOT EXISTS 'cancelled';

-- Existing orders keep NULL ("legacy": points were already granted at creation
-- by the previous logic, so lifecycle loyalty must never touch them).
ALTER TABLE "orders" ADD COLUMN "loyalty_points_awarded" integer;

ALTER TABLE "orders" ALTER COLUMN "loyalty_points_awarded" SET DEFAULT 0;

ALTER TABLE "orders" ADD COLUMN "access_token_hash" varchar(64);

ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_order_id_unique" UNIQUE ("order_id");

-- collections.images + full 116-column app-schema postcondition (from recover-production-schema.sql)


-- 1. PREFLIGHT ------------------------------------------------------------
DO $$
DECLARE
  problems text[] := '{}';
  t text;
  dup boolean;
BEGIN
  FOREACH t IN ARRAY ARRAY['products', 'reviews', 'orders', 'users', 'collections'] LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      problems := array_append(problems, format('table public.%s does not exist', t));
    END IF;
  END LOOP;

  -- reviews renames: the source column must have a compatible type, and the
  -- target name must not already exist alongside it (ambiguous data).
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'body') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'comment') THEN
      problems := array_append(problems, 'reviews has both body and comment');
    ELSIF (SELECT udt_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'body') NOT IN ('text', 'varchar') THEN
      problems := array_append(problems, 'reviews.body is not text');
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'approved') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'is_approved') THEN
      problems := array_append(problems, 'reviews has both approved and is_approved');
    ELSIF (SELECT udt_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'approved') <> 'bool' THEN
      problems := array_append(problems, 'reviews.approved is not boolean');
    END IF;
  END IF;

  -- collections images
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'collections' AND column_name = 'image')
     AND (SELECT udt_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'collections' AND column_name = 'image') NOT IN ('text', 'varchar') THEN
    problems := array_append(problems, 'collections.image is not text');
  END IF;

  -- unique constraints the app relies on must not conflict with existing rows
  -- (dynamic SQL: these tables/columns may not exist, so they must not be
  -- referenced directly)
  IF (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reviews'
      AND column_name IN ('user_id', 'product_id')) = 2 THEN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.reviews WHERE user_id IS NOT NULL GROUP BY user_id, product_id HAVING count(*) > 1)' INTO dup;
    IF dup THEN problems := array_append(problems, 'reviews has duplicate (user_id, product_id) rows'); END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'phone_models' AND column_name = 'name') THEN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.phone_models GROUP BY name HAVING count(*) > 1)' INTO dup;
    IF dup THEN problems := array_append(problems, 'phone_models has duplicate names'); END IF;
  END IF;

  IF cardinality(problems) > 0 THEN
    RAISE EXCEPTION 'Recovery not applied, nothing was changed: %', array_to_string(problems, '; ');
  END IF;
END $$;

-- 2. ENUM TYPES (migrations 0000, 0007, 0008) ------------------------------
DO $$ BEGIN CREATE TYPE "public"."user_role" AS ENUM ('customer', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "public"."order_status" AS ENUM ('pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "public"."payment_method" AS ENUM ('cash_on_delivery');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "public"."coupon_type" AS ENUM ('percentage', 'fixed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "public"."hero_media_type" AS ENUM ('image', 'video');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "public"."loyalty_transaction_type" AS ENUM ('earned', 'redeemed', 'reward_redeemed', 'reversed', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "public"."reward_status" AS ENUM ('available', 'redeemed', 'expired', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- If those two types already existed with older labels (0007), add 0008's.
ALTER TYPE "public"."loyalty_transaction_type" ADD VALUE IF NOT EXISTS 'reversed';
ALTER TYPE "public"."loyalty_transaction_type" ADD VALUE IF NOT EXISTS 'refunded';
ALTER TYPE "public"."reward_status" ADD VALUE IF NOT EXISTS 'cancelled';

-- 3. EXISTING TABLES ------------------------------------------------------
-- products (0002, 0006)
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "made_to_order" boolean DEFAULT false NOT NULL;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "is_deleted" boolean DEFAULT false NOT NULL;

-- users (0000, 0002, 0007)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" varchar(50);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" varchar(500);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "loyalty_points" integer DEFAULT 0 NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "loyalty_points_earned" integer DEFAULT 0 NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "loyalty_points_redeemed" integer DEFAULT 0 NOT NULL;

-- orders (0003, 0007, 0008)
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "idempotency_key" varchar(100);
CREATE UNIQUE INDEX IF NOT EXISTS "orders_idempotency_key_unique" ON "orders" ("idempotency_key");
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "loyalty_discount" integer DEFAULT 0 NOT NULL;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "loyalty_points_used" integer DEFAULT 0 NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'loyalty_points_awarded') THEN
    -- existing orders stay NULL (legacy); new orders default to 0
    ALTER TABLE "orders" ADD COLUMN "loyalty_points_awarded" integer;
    ALTER TABLE "orders" ALTER COLUMN "loyalty_points_awarded" SET DEFAULT 0;
  END IF;
END $$;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "access_token_hash" varchar(64);

-- reviews: rename to the app's names (data preserved), then add 0002/0004/0005
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'body') THEN
    ALTER TABLE "reviews" RENAME COLUMN "body" TO "comment";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'approved') THEN
    ALTER TABLE "reviews" RENAME COLUMN "approved" TO "is_approved";
  END IF;
END $$;
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "comment" text;
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "is_approved" boolean DEFAULT false NOT NULL;
ALTER TABLE "reviews" ALTER COLUMN "is_approved" SET DEFAULT false;
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "customer_name" varchar(255);
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "title" varchar(255);
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "is_homepage" boolean DEFAULT false NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "reviews_user_product_unique" ON "reviews" ("user_id", "product_id");

-- collections: one image -> one-item images list (old column kept)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'collections' AND column_name = 'images') THEN
    ALTER TABLE "collections" ADD COLUMN "images" json DEFAULT '[]'::json NOT NULL;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'collections' AND column_name = 'image') THEN
      UPDATE "collections" SET "images" = json_build_array(trim("image"))
      WHERE nullif(trim("image"), '') IS NOT NULL;
    END IF;
  END IF;
END $$;

-- 4. TABLES THE APP NEEDS, created only if absent (definitions from 0000, 0001, 0007)
CREATE TABLE IF NOT EXISTS "settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "key" varchar(255) NOT NULL,
  "value" text NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "settings_key_unique" UNIQUE("key")
);
CREATE TABLE IF NOT EXISTS "coupons" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" varchar(100) NOT NULL,
  "type" "coupon_type" NOT NULL,
  "value" integer NOT NULL,
  "max_uses" integer,
  "used_count" integer DEFAULT 0 NOT NULL,
  "expires_at" timestamp,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "coupons_code_unique" UNIQUE("code")
);
CREATE TABLE IF NOT EXISTS "order_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid NOT NULL REFERENCES "orders"("id"),
  "product_id" uuid REFERENCES "products"("id"),
  "product_name" varchar(255) NOT NULL,
  "product_image" varchar(500),
  "phone_model" varchar(255),
  "quantity" integer NOT NULL,
  "price" integer NOT NULL,
  "total" integer NOT NULL
);
CREATE TABLE IF NOT EXISTS "wishlist" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "product_id" uuid NOT NULL REFERENCES "products"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "phone_models" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "brand" varchar(100) NOT NULL,
  "name" varchar(255) NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "phone_models_name_unique" UNIQUE("name")
);
CREATE TABLE IF NOT EXISTS "loyalty_transactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "type" "loyalty_transaction_type" NOT NULL,
  "points" integer NOT NULL,
  "order_id" uuid REFERENCES "orders"("id"),
  "description" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
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
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reward_redemptions_order_id_unique') THEN
    ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_order_id_unique" UNIQUE ("order_id");
  END IF;
END $$;

-- 5. POSTCONDITION: the schema must match what the deployed app reads ------
DO $$
DECLARE
  problems text[];
BEGIN
  WITH expected(table_name, column_name, accepted) AS (VALUES
    ('collections', 'id', 'uuid'),
    ('collections', 'name', 'varchar|text'),
    ('collections', 'slug', 'varchar|text'),
    ('collections', 'description', 'text|varchar'),
    ('collections', 'is_active', 'bool'),
    ('collections', 'created_at', 'timestamp|timestamptz'),
    ('collections', 'images', 'json|jsonb'),
    ('coupons', 'id', 'uuid'),
    ('coupons', 'code', 'varchar|text'),
    ('coupons', 'type', 'coupon_type|text|varchar'),
    ('coupons', 'value', 'int4'),
    ('coupons', 'max_uses', 'int4'),
    ('coupons', 'used_count', 'int4'),
    ('coupons', 'expires_at', 'timestamp|timestamptz'),
    ('coupons', 'is_active', 'bool'),
    ('coupons', 'created_at', 'timestamp|timestamptz'),
    ('loyalty_transactions', 'id', 'uuid'),
    ('loyalty_transactions', 'user_id', 'uuid'),
    ('loyalty_transactions', 'type', 'loyalty_transaction_type|text|varchar'),
    ('loyalty_transactions', 'points', 'int4'),
    ('loyalty_transactions', 'order_id', 'uuid'),
    ('loyalty_transactions', 'description', 'text|varchar'),
    ('loyalty_transactions', 'created_at', 'timestamp|timestamptz'),
    ('order_items', 'id', 'uuid'),
    ('order_items', 'order_id', 'uuid'),
    ('order_items', 'product_id', 'uuid'),
    ('order_items', 'product_name', 'varchar|text'),
    ('order_items', 'product_image', 'varchar|text'),
    ('order_items', 'phone_model', 'varchar|text'),
    ('order_items', 'quantity', 'int4'),
    ('order_items', 'price', 'int4'),
    ('order_items', 'total', 'int4'),
    ('orders', 'id', 'uuid'),
    ('orders', 'user_id', 'uuid'),
    ('orders', 'customer_name', 'varchar|text'),
    ('orders', 'phone', 'varchar|text'),
    ('orders', 'email', 'varchar|text'),
    ('orders', 'address', 'text|varchar'),
    ('orders', 'city', 'varchar|text'),
    ('orders', 'postal_code', 'varchar|text'),
    ('orders', 'notes', 'text|varchar'),
    ('orders', 'subtotal', 'int4'),
    ('orders', 'shipping_price', 'int4'),
    ('orders', 'discount', 'int4'),
    ('orders', 'total', 'int4'),
    ('orders', 'status', 'order_status|text|varchar'),
    ('orders', 'payment_method', 'payment_method|text|varchar'),
    ('orders', 'coupon_code', 'varchar|text'),
    ('orders', 'created_at', 'timestamp|timestamptz'),
    ('orders', 'updated_at', 'timestamp|timestamptz'),
    ('orders', 'idempotency_key', 'varchar|text'),
    ('orders', 'loyalty_discount', 'int4'),
    ('orders', 'loyalty_points_used', 'int4'),
    ('orders', 'loyalty_points_awarded', 'int4'),
    ('orders', 'access_token_hash', 'varchar|text'),
    ('phone_models', 'id', 'uuid'),
    ('phone_models', 'brand', 'varchar|text'),
    ('phone_models', 'name', 'varchar|text'),
    ('phone_models', 'is_active', 'bool'),
    ('phone_models', 'created_at', 'timestamp|timestamptz'),
    ('products', 'id', 'uuid'),
    ('products', 'name', 'varchar|text'),
    ('products', 'slug', 'varchar|text'),
    ('products', 'description', 'text|varchar'),
    ('products', 'price', 'int4'),
    ('products', 'compare_price', 'int4'),
    ('products', 'images', 'json|jsonb'),
    ('products', 'compatible_models', 'json|jsonb'),
    ('products', 'stock', 'int4'),
    ('products', 'collection_id', 'uuid'),
    ('products', 'tags', 'json|jsonb'),
    ('products', 'is_best_seller', 'bool'),
    ('products', 'is_featured', 'bool'),
    ('products', 'is_active', 'bool'),
    ('products', 'created_at', 'timestamp|timestamptz'),
    ('products', 'updated_at', 'timestamp|timestamptz'),
    ('products', 'made_to_order', 'bool'),
    ('products', 'is_deleted', 'bool'),
    ('reviews', 'id', 'uuid'),
    ('reviews', 'product_id', 'uuid'),
    ('reviews', 'user_id', 'uuid'),
    ('reviews', 'customer_name', 'varchar|text'),
    ('reviews', 'rating', 'int4'),
    ('reviews', 'comment', 'text|varchar'),
    ('reviews', 'is_approved', 'bool'),
    ('reviews', 'created_at', 'timestamp|timestamptz'),
    ('reviews', 'title', 'varchar|text'),
    ('reviews', 'is_homepage', 'bool'),
    ('reward_redemptions', 'id', 'uuid'),
    ('reward_redemptions', 'user_id', 'uuid'),
    ('reward_redemptions', 'product_id', 'uuid'),
    ('reward_redemptions', 'phone_model', 'varchar|text'),
    ('reward_redemptions', 'points_used', 'int4'),
    ('reward_redemptions', 'status', 'reward_status|text|varchar'),
    ('reward_redemptions', 'order_id', 'uuid'),
    ('reward_redemptions', 'created_at', 'timestamp|timestamptz'),
    ('settings', 'id', 'uuid'),
    ('settings', 'key', 'varchar|text'),
    ('settings', 'value', 'text|varchar'),
    ('settings', 'updated_at', 'timestamp|timestamptz'),
    ('users', 'id', 'uuid'),
    ('users', 'name', 'varchar|text'),
    ('users', 'email', 'varchar|text'),
    ('users', 'phone', 'varchar|text'),
    ('users', 'password_hash', 'text|varchar'),
    ('users', 'role', 'user_role|text|varchar'),
    ('users', 'loyalty_points', 'int4'),
    ('users', 'created_at', 'timestamp|timestamptz'),
    ('users', 'updated_at', 'timestamp|timestamptz'),
    ('users', 'avatar_url', 'varchar|text'),
    ('users', 'loyalty_points_earned', 'int4'),
    ('users', 'loyalty_points_redeemed', 'int4'),
    ('wishlist', 'id', 'uuid'),
    ('wishlist', 'user_id', 'uuid'),
    ('wishlist', 'product_id', 'uuid'),
    ('wishlist', 'created_at', 'timestamp|timestamptz')
  )
  SELECT array_agg(
           CASE WHEN c.column_name IS NULL THEN format('missing %s.%s', e.table_name, e.column_name)
                ELSE format('%s.%s is %s (expected %s)', e.table_name, e.column_name, c.udt_name, e.accepted) END
           ORDER BY e.table_name, e.column_name)
  INTO problems
  FROM expected e
  LEFT JOIN information_schema.columns c
    ON c.table_schema = 'public' AND c.table_name = e.table_name AND c.column_name = e.column_name
  WHERE c.column_name IS NULL
     OR NOT (c.udt_name = ANY (string_to_array(e.accepted, '|')));

  -- The app never supplies ids or created_at: both need a default.
  problems := coalesce(problems, '{}') || coalesce((
    SELECT array_agg(format('%s.%s has no default', table_name, column_name) ORDER BY table_name, column_name)
    FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name IN ('id', 'created_at') AND column_default IS NULL
      AND table_name IN ('collections', 'coupons', 'loyalty_transactions', 'order_items', 'orders', 'phone_models',
                         'products', 'reviews', 'reward_redemptions', 'settings', 'users', 'wishlist')
  ), '{}');

  -- Enum-typed columns must accept every value the app writes.
  problems := problems || coalesce((
    SELECT array_agg(format('enum %s lacks label %s', v.typ, v.label))
    FROM (VALUES
      ('user_role', 'customer'), ('user_role', 'admin'),
      ('order_status', 'pending'), ('order_status', 'confirmed'), ('order_status', 'preparing'),
      ('order_status', 'shipped'), ('order_status', 'delivered'), ('order_status', 'cancelled'),
      ('payment_method', 'cash_on_delivery'), ('coupon_type', 'percentage'), ('coupon_type', 'fixed'),
      ('loyalty_transaction_type', 'earned'), ('loyalty_transaction_type', 'reward_redeemed'),
      ('loyalty_transaction_type', 'reversed'), ('loyalty_transaction_type', 'refunded'),
      ('reward_status', 'redeemed'), ('reward_status', 'cancelled')
    ) AS v(typ, label)
    WHERE EXISTS (SELECT 1 FROM pg_type t WHERE t.typname = v.typ AND t.typnamespace = 'public'::regnamespace)
      AND NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
                      WHERE t.typname = v.typ AND t.typnamespace = 'public'::regnamespace AND e.enumlabel = v.label)
  ), '{}');

  IF cardinality(problems) > 0 THEN
    RAISE EXCEPTION 'Recovery rolled back, nothing was changed. Schema still differs from the app: %',
      array_to_string(problems, '; ');
  END IF;
  RAISE NOTICE 'Schema now matches the deployed app (116 columns verified).';
END $$;


-- 3. COPY THE DATA ---------------------------------------------------------------
CREATE TABLE wrapy_legacy.id_map (
  table_name text NOT NULL, old_id integer NOT NULL, new_id uuid NOT NULL DEFAULT gen_random_uuid(),
  PRIMARY KEY (table_name, old_id)
);
INSERT INTO wrapy_legacy.id_map (table_name, old_id) SELECT 'users', id FROM wrapy_legacy.users;
INSERT INTO wrapy_legacy.id_map (table_name, old_id) SELECT 'collections', id FROM wrapy_legacy.collections;
INSERT INTO wrapy_legacy.id_map (table_name, old_id) SELECT 'products', id FROM wrapy_legacy.products;
INSERT INTO wrapy_legacy.id_map (table_name, old_id) SELECT 'orders', id FROM wrapy_legacy.orders;
INSERT INTO wrapy_legacy.id_map (table_name, old_id) SELECT 'reviews', id FROM wrapy_legacy.reviews;

INSERT INTO public.users (id, name, email, phone, password_hash, role, loyalty_points, loyalty_points_earned, created_at, updated_at)
SELECT m.new_id, left(nullif(trim(concat_ws(' ', u.first_name, u.last_name)), ''), 255), lower(u.email), u.phone,
       u.password_hash, u.role::text::public.user_role, u.loyalty_points, u.loyalty_points, u.created_at, u.updated_at
FROM wrapy_legacy.users u JOIN wrapy_legacy.id_map m ON m.table_name = 'users' AND m.old_id = u.id;

INSERT INTO public.collections (id, name, slug, description, images, is_active, created_at)
SELECT m.new_id, c.name, c.slug, nullif(c.description, ''),
       CASE WHEN nullif(trim(c.image_url), '') IS NULL THEN '[]'::json ELSE json_build_array(trim(c.image_url)) END,
       true, c.created_at
FROM wrapy_legacy.collections c JOIN wrapy_legacy.id_map m ON m.table_name = 'collections' AND m.old_id = c.id;

INSERT INTO public.products (id, name, slug, description, price, compare_price, images, compatible_models, stock,
       made_to_order, collection_id, tags, is_best_seller, is_featured, is_active, is_deleted, created_at, updated_at)
SELECT m.new_id, p.name, p.slug, nullif(p.description, ''), round(p.price * 1000)::int, round(p.compare_price * 1000)::int,
       p.images, p.compatible_models, p.stock, false, mc.new_id, p.tags, p.is_best_seller, p.is_featured, p.is_active,
       false, p.created_at, p.updated_at
FROM wrapy_legacy.products p
JOIN wrapy_legacy.id_map m ON m.table_name = 'products' AND m.old_id = p.id
LEFT JOIN wrapy_legacy.id_map mc ON mc.table_name = 'collections' AND mc.old_id = p.collection_id;

INSERT INTO public.orders (id, user_id, customer_name, phone, email, address, city, notes, subtotal, shipping_price,
       discount, total, status, payment_method, coupon_code, loyalty_points_awarded, created_at, updated_at)
SELECT m.new_id, mu.new_id, o.shipping_name, o.shipping_phone, NULL, o.shipping_address, o.shipping_city,
       concat_ws(' · ', nullif(o.notes, ''), 'Commande ' || o.order_number),
       round(o.subtotal * 1000)::int, round(o.shipping_cost * 1000)::int, round(o.discount_amount * 1000)::int,
       round(o.total * 1000)::int,
       (CASE o.status::text WHEN 'processing' THEN 'preparing' ELSE o.status::text END)::public.order_status,
       'cash_on_delivery', o.promo_code, NULL, o.created_at, o.updated_at
FROM wrapy_legacy.orders o
JOIN wrapy_legacy.id_map m ON m.table_name = 'orders' AND m.old_id = o.id
LEFT JOIN wrapy_legacy.id_map mu ON mu.table_name = 'users' AND mu.old_id = o.user_id;

INSERT INTO public.order_items (order_id, product_id, product_name, product_image, phone_model, quantity, price, total)
SELECT mo.new_id, mp.new_id, i.product_name, i.product_image, i.phone_model, i.quantity,
       round(i.price * 1000)::int, round(i.price * 1000)::int * i.quantity
FROM wrapy_legacy.order_items i
JOIN wrapy_legacy.id_map mo ON mo.table_name = 'orders' AND mo.old_id = i.order_id
LEFT JOIN wrapy_legacy.id_map mp ON mp.table_name = 'products' AND mp.old_id = i.product_id;

INSERT INTO public.reviews (id, product_id, user_id, title, rating, comment, is_approved, is_homepage, created_at)
SELECT m.new_id, mp.new_id, mu.new_id, r.title, r.rating, r.body, r.approved, false, r.created_at
FROM wrapy_legacy.reviews r
JOIN wrapy_legacy.id_map m ON m.table_name = 'reviews' AND m.old_id = r.id
JOIN wrapy_legacy.id_map mp ON mp.table_name = 'products' AND mp.old_id = r.product_id
LEFT JOIN wrapy_legacy.id_map mu ON mu.table_name = 'users' AND mu.old_id = r.user_id;

INSERT INTO public.loyalty_transactions (user_id, order_id, type, points, description, created_at)
SELECT mu.new_id, mo.new_id, 'earned', l.points, l.reason, l.created_at
FROM wrapy_legacy.loyalty_history l
JOIN wrapy_legacy.id_map mu ON mu.table_name = 'users' AND mu.old_id = l.user_id
LEFT JOIN wrapy_legacy.id_map mo ON mo.table_name = 'orders' AND mo.old_id = l.order_id;

INSERT INTO public.coupons (code, type, value, max_uses, used_count, expires_at, is_active, created_at)
SELECT upper(code), (CASE WHEN discount_type = 'fixed' THEN 'fixed' ELSE 'percentage' END)::public.coupon_type,
       CASE WHEN discount_type = 'fixed' THEN round(discount_value * 1000)::int ELSE round(discount_value)::int END,
       max_uses, used_count, expires_at, is_active, created_at
FROM wrapy_legacy.promo_codes;

-- Site texts (only non-empty values; the signed logo URL is intentionally skipped)
INSERT INTO public.settings (key, value)
SELECT k, v FROM wrapy_legacy.site_settings s,
LATERAL (VALUES ('primary_color', s.primary_color), ('hero_title', s.hero_headline), ('hero_subtitle', s.hero_subheadline),
                ('hero_button_text', s.hero_cta_text), ('hero_button_link', s.hero_cta_url)) AS kv(k, v)
WHERE nullif(trim(v), '') IS NOT NULL
ON CONFLICT (key) DO NOTHING;

-- 4. RLS ON EVERY NEW TABLE (Data API blocked; the app's postgres role is unaffected)
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['collections','coupons','loyalty_transactions','order_items','orders','phone_models',
    'products','reviews','reward_redemptions','settings','users','wishlist'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- 5. VERIFY THE COPY ---------------------------------------------------------------
DO $$
DECLARE problems text[] := '{}';
BEGIN
  IF (SELECT count(*) FROM public.users) <> (SELECT count(*) FROM wrapy_legacy.users) THEN problems := array_append(problems, 'users count'); END IF;
  IF (SELECT count(*) FROM public.collections) <> (SELECT count(*) FROM wrapy_legacy.collections) THEN problems := array_append(problems, 'collections count'); END IF;
  IF (SELECT count(*) FROM public.products) <> (SELECT count(*) FROM wrapy_legacy.products) THEN problems := array_append(problems, 'products count'); END IF;
  IF (SELECT count(*) FROM public.orders) <> (SELECT count(*) FROM wrapy_legacy.orders) THEN problems := array_append(problems, 'orders count'); END IF;
  IF (SELECT count(*) FROM public.order_items) <> (SELECT count(*) FROM wrapy_legacy.order_items) THEN problems := array_append(problems, 'order_items count'); END IF;
  IF (SELECT count(*) FROM public.reviews) <> (SELECT count(*) FROM wrapy_legacy.reviews) THEN problems := array_append(problems, 'reviews count'); END IF;
  IF (SELECT count(*) FROM public.loyalty_transactions) <> (SELECT count(*) FROM wrapy_legacy.loyalty_history) THEN problems := array_append(problems, 'loyalty count'); END IF;
  IF (SELECT count(*) FROM public.coupons) <> (SELECT count(*) FROM wrapy_legacy.promo_codes) THEN problems := array_append(problems, 'coupons count'); END IF;
  IF (SELECT coalesce(sum(price), 0) FROM public.products) <> (SELECT coalesce(round(sum(price) * 1000), 0) FROM wrapy_legacy.products) THEN problems := array_append(problems, 'product prices'); END IF;
  IF (SELECT coalesce(sum(total), 0) FROM public.orders) <> (SELECT coalesce(round(sum(total) * 1000), 0) FROM wrapy_legacy.orders) THEN problems := array_append(problems, 'order totals'); END IF;
  IF (SELECT coalesce(sum(loyalty_points), 0) FROM public.users) <> (SELECT coalesce(sum(loyalty_points), 0) FROM wrapy_legacy.users) THEN problems := array_append(problems, 'loyalty balances'); END IF;
  IF EXISTS (SELECT 1 FROM public.orders WHERE loyalty_points_awarded IS NOT NULL) THEN problems := array_append(problems, 'legacy orders not marked'); END IF;
  IF EXISTS (SELECT 1 FROM public.products p JOIN wrapy_legacy.id_map m ON m.new_id = p.id
             JOIN wrapy_legacy.products lp ON lp.id = m.old_id AND m.table_name = 'products'
             WHERE (lp.collection_id IS NULL) <> (p.collection_id IS NULL)) THEN problems := array_append(problems, 'product collection links'); END IF;
  IF cardinality(problems) > 0 THEN
    RAISE EXCEPTION 'Migration rolled back, nothing was changed. Copy verification failed: %', array_to_string(problems, '; ');
  END IF;
  RAISE NOTICE 'Data copied and verified (counts, money totals, balances, links).';
END $$;

COMMIT;
