-- Category order and homepage selection (run once after migration 0009).
-- Reuses the existing collections (no duplicates); product links are untouched.
-- Featured flags come from the old site's own data (wrapy_legacy.collections.featured).
-- Order follows the brief: Carbon, Marble, Anime, Neon, Minimal.
BEGIN;
UPDATE collections SET sort_order = 1, is_featured = true WHERE slug = 'carbon-series';
UPDATE collections SET sort_order = 2, is_featured = true WHERE slug = 'marble-edition';
-- Display name only; the slug (and every link to /collections/anime) stays the same.
UPDATE collections SET sort_order = 3, is_featured = true, name = 'Anime' WHERE slug = 'anime';
UPDATE collections SET sort_order = 4, is_featured = true WHERE slug = 'neon-cyber';
-- New and empty: shown with its own fallback identity and "Bientôt disponible"
-- until products and a cover image are added in admin.
INSERT INTO collections (name, slug, description, images, is_active, is_featured, sort_order)
SELECT 'Minimal', 'minimal', NULL, '[]'::json, true, true, 5
WHERE NOT EXISTS (SELECT 1 FROM collections WHERE slug = 'minimal');
COMMIT;
