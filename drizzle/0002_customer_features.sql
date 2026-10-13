ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "made_to_order" boolean DEFAULT false NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" varchar(500);
UPDATE "reviews" SET "is_approved" = false
WHERE "customer_name" = 'Ahmed'
  AND "comment" = 'Amazing quality! The carbon fiber texture feels incredible.'
  AND "rating" = 5;
WITH ranked AS (
  SELECT "id", row_number() OVER (PARTITION BY "user_id", "product_id" ORDER BY "created_at", "id") AS position
  FROM "reviews" WHERE "user_id" IS NOT NULL
)
UPDATE "reviews" SET "user_id" = NULL WHERE "id" IN (SELECT "id" FROM ranked WHERE position > 1);
CREATE UNIQUE INDEX IF NOT EXISTS "reviews_user_product_unique" ON "reviews" ("user_id", "product_id");
