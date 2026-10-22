-- Wrapy: apply migration 0008 to production (Supabase SQL editor).
-- Run this BEFORE deploying the commit that introduces it.
--
-- One transaction: it either fully applies or changes nothing.
-- It refuses to run if the schema is not exactly what 0008 expects, so it never
-- masks an inconsistent database. Additive only; no row is modified or deleted.

BEGIN;

DO $$
DECLARE
  missing text;
BEGIN
  -- 1. Prerequisites from migrations 0002-0007 must already be present.
  SELECT string_agg(req, ', ') INTO missing
  FROM (VALUES
    ('products.is_deleted'), ('products.made_to_order'), ('users.avatar_url'),
    ('users.loyalty_points_earned'), ('users.loyalty_points_redeemed'),
    ('orders.idempotency_key'), ('orders.loyalty_discount'), ('orders.loyalty_points_used'),
    ('reviews.title'), ('reviews.is_homepage'), ('collections.images'),
    ('loyalty_transactions.id'), ('reward_redemptions.order_id')
  ) AS r(req)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = split_part(r.req, '.', 1)
      AND c.column_name = split_part(r.req, '.', 2)
  );
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'Not applied: production is missing earlier migrations (%). Nothing was changed.', missing;
  END IF;

  -- 2. 0008 must not be (partly) applied already.
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public'
             AND table_name = 'orders' AND column_name IN ('loyalty_points_awarded', 'access_token_hash')) THEN
    RAISE EXCEPTION 'Not applied: 0008 columns already exist. Nothing was changed.';
  END IF;

  -- 3. The new unique constraint must not conflict with existing rows.
  IF EXISTS (SELECT order_id FROM reward_redemptions WHERE order_id IS NOT NULL
             GROUP BY order_id HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Not applied: duplicate reward_redemptions.order_id rows exist. Nothing was changed.';
  END IF;
END $$;

ALTER TYPE "public"."loyalty_transaction_type" ADD VALUE IF NOT EXISTS 'reversed';
ALTER TYPE "public"."loyalty_transaction_type" ADD VALUE IF NOT EXISTS 'refunded';
ALTER TYPE "public"."reward_status" ADD VALUE IF NOT EXISTS 'cancelled';

-- Existing orders stay NULL = "legacy": their points were already granted at
-- creation by the old logic, so the new lifecycle logic never adjusts them.
ALTER TABLE "orders" ADD COLUMN "loyalty_points_awarded" integer;
ALTER TABLE "orders" ALTER COLUMN "loyalty_points_awarded" SET DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN "access_token_hash" varchar(64);
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_order_id_unique" UNIQUE ("order_id");

COMMIT;

-- Verification (should return 3 rows):
SELECT table_name, column_name, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND ((table_name = 'orders' AND column_name IN ('loyalty_points_awarded', 'access_token_hash'))
    OR (table_name = 'reward_redemptions' AND column_name = 'order_id'));
