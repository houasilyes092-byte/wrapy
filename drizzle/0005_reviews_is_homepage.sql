-- Add is_homepage field to reviews table
ALTER TABLE "reviews" ADD COLUMN "is_homepage" BOOLEAN NOT NULL DEFAULT FALSE;