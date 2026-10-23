-- Wrapy: production schema recovery (Supabase SQL Editor).
--
-- WHY: the production project was not built from Wrapy's migrations. Its
-- `reviews` table uses `body`/`approved` instead of `comment`/`is_approved`,
-- and columns from migrations 0002-0008 are missing, so the deployed app
-- cannot query it.
--
-- WHAT: brings the existing schema to exactly what the deployed app reads
-- (commit 48d77a3), and includes migration 0008. You do NOT also need
-- apply-0008.sql.
--
-- SAFETY
-- * One transaction. Any failed check raises an error and NOTHING is changed.
-- * Additive only. No table, column or row is dropped or deleted.
-- * Existing data is preserved:
--     - reviews.body -> comment and reviews.approved -> is_approved are
--       RENAMED, so existing review text and approval status keep their meaning;
--     - each collections.image becomes a one-item collections.images list
--       (the old `image` column is kept);
--     - existing orders are marked legacy (loyalty_points_awarded = NULL),
--       so the new loyalty logic never re-awards their points.
-- * The two data changes in migration 0002 (hiding one seed review and
--   anonymising duplicate reviews) are NOT applied.
-- * Every statement is guarded, so re-running it on a recovered database
--   changes nothing and only re-verifies the schema.
-- * Final step: the complete schema is compared with what the app reads
--   (116 columns, accepted types, id defaults, enum labels). Any mismatch
--   aborts and rolls everything back, listing exactly what is wrong.
--
-- BEFORE RUNNING: select the right project (URL contains its ref) and take a
-- backup (Database -> Backups, or an export).

BEGIN;

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

COMMIT;
