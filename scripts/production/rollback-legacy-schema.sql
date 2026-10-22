-- Wrapy: undo migrate-legacy-schema.sql (manual use only, Supabase SQL Editor).
--
-- Restores the original tables from schema wrapy_legacy to public, exactly as
-- they were, and removes the app tables created by the migration.
--
-- It REFUSES to run if any order, user, product or collection exists in the
-- app tables that did not come from the migration: rolling back after the new
-- site has taken real orders would lose them.

BEGIN;

DO $$ BEGIN
  IF to_regclass('wrapy_legacy.id_map') IS NULL THEN
    RAISE EXCEPTION 'Not applied, nothing changed: wrapy_legacy.id_map not found (migration not applied?)';
  END IF;
  IF EXISTS (SELECT 1 FROM public.orders o WHERE NOT EXISTS (SELECT 1 FROM wrapy_legacy.id_map m WHERE m.table_name = 'orders' AND m.new_id = o.id))
     OR EXISTS (SELECT 1 FROM public.users u WHERE NOT EXISTS (SELECT 1 FROM wrapy_legacy.id_map m WHERE m.table_name = 'users' AND m.new_id = u.id))
     OR EXISTS (SELECT 1 FROM public.products p WHERE NOT EXISTS (SELECT 1 FROM wrapy_legacy.id_map m WHERE m.table_name = 'products' AND m.new_id = p.id))
     OR EXISTS (SELECT 1 FROM public.collections c WHERE NOT EXISTS (SELECT 1 FROM wrapy_legacy.id_map m WHERE m.table_name = 'collections' AND m.new_id = c.id)) THEN
    RAISE EXCEPTION 'Not applied, nothing changed: the app tables contain data created after the migration';
  END IF;
END $$;

-- Remove the app tables created by the migration (they only hold copies of legacy data)
DROP TABLE public.reward_redemptions, public.loyalty_transactions, public.wishlist, public.reviews,
           public.order_items, public.orders, public.products, public.collections, public.coupons,
           public.settings, public.phone_models, public.users;
DROP TYPE public.user_role, public.order_status, public.payment_method, public.coupon_type,
          public.hero_media_type, public.loyalty_transaction_type, public.reward_status;

-- Put the original tables and types back
ALTER TYPE wrapy_legacy.order_status SET SCHEMA public;
ALTER TYPE wrapy_legacy.user_role SET SCHEMA public;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['addresses','cart_items','collections','content_pages','faqs','homepage_sections',
    'loyalty_history','marketing_settings','media_assets','newsletter_subscribers','order_items','orders',
    'products','promo_codes','reviews','site_settings','users'] LOOP
    EXECUTE format('ALTER TABLE wrapy_legacy.%I SET SCHEMA public', t);
  END LOOP;
END $$;
DROP TABLE wrapy_legacy.id_map;
DROP SCHEMA wrapy_legacy;

COMMIT;
