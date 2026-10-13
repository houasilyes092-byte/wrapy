-- Add title field to reviews table
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "title" VARCHAR(255);
