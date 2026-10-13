ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "idempotency_key" varchar(100);
CREATE UNIQUE INDEX IF NOT EXISTS "orders_idempotency_key_unique" ON "orders" ("idempotency_key");
