# Wrapy GitHub / Netlify release export

This is a file export from the existing project tree. No source files were moved or overwritten. The `.git` directory is not included.

## Exported files

- RELEASE-MANIFEST.md (this manifest)
- .env.example
- .gitignore
- .vscode/settings.json
- drizzle.config.ts
- drizzle/0000_youthful_salo.sql
- drizzle/0001_old_onslaught.sql
- drizzle/0002_customer_features.sql
- drizzle/0003_orders_idempotency_key.sql
- drizzle/0004_reviews_title.sql
- drizzle/0005_reviews_is_homepage.sql
- drizzle/0006_products_soft_delete.sql
- drizzle/0007_loyalty_schema.sql
- drizzle/meta/0000_snapshot.json
- drizzle/meta/0001_snapshot.json
- drizzle/meta/_journal.json
- drizzle/relations.ts
- drizzle/schema.ts
- eslint.config.mjs
- netlify.toml
- next-env.d.ts
- next.config.ts
- package-lock.json
- package.json
- postcss.config.mjs
- public/collections/1.png
- public/collections/banniere 1.png
- public/products/4.png
- public/site/logo/logo.png
- public/uploads/1786493857327-22ea95a806a9056b.png
- public/uploads/1786494653067-38a347b50f9f9b9b.png
- public/uploads/1786494737858-3342ceb027e373b7.png
- public/uploads/1786498883592-93f2be08ea5e10df.png
- public/uploads/1786501163870-d1a85e4bda0563ba.png
- src/app/(store)/account/orders/page.tsx
- src/app/(store)/account/page.tsx
- src/app/(store)/account/wishlist/page.tsx
- src/app/(store)/cart/page.tsx
- src/app/(store)/checkout/page.tsx
- src/app/(store)/collections/[slug]/page.tsx
- src/app/(store)/error.tsx
- src/app/(store)/layout.tsx
- src/app/(store)/order-success/[id]/page.tsx
- src/app/(store)/page.tsx
- src/app/(store)/skins/[slug]/page.tsx
- src/app/(store)/skins/page.tsx
- src/app/admin/collections/page.tsx
- src/app/admin/coupons/page.tsx
- src/app/admin/customers/page.tsx
- src/app/admin/error.tsx
- src/app/admin/layout.tsx
- src/app/admin/orders/[id]/page.tsx
- src/app/admin/orders/page.tsx
- src/app/admin/page.tsx
- src/app/admin/phone-models/page.tsx
- src/app/admin/products/[id]/edit/page.tsx
- src/app/admin/products/new/page.tsx
- src/app/admin/products/page.tsx
- src/app/admin/reviews/page.tsx
- src/app/admin/settings/page.tsx
- src/app/api/account/avatar/route.ts
- src/app/api/account/profile/route.ts
- src/app/api/admin/collections/route.ts
- src/app/api/admin/coupons/route.ts
- src/app/api/admin/customers/route.ts
- src/app/api/admin/orders/[id]/route.ts
- src/app/api/admin/orders/route.ts
- src/app/api/admin/phone-models/[id]/route.ts
- src/app/api/admin/phone-models/route.ts
- src/app/api/admin/products/[id]/route.ts
- src/app/api/admin/products/route.ts
- src/app/api/admin/reviews/route.ts
- src/app/api/admin/settings/route.ts
- src/app/api/admin/stats/route.ts
- src/app/api/admin/upload/route.ts
- src/app/api/auth/login/route.ts
- src/app/api/auth/logout/route.ts
- src/app/api/auth/me/route.ts
- src/app/api/auth/register/route.ts
- src/app/api/coupons/validate/route.ts
- src/app/api/health/route.ts
- src/app/api/orders/route.ts
- src/app/api/phone-models/route.ts
- src/app/api/reviews/route.ts
- src/app/api/settings/route.ts
- src/app/api/wishlist/route.ts
- src/app/auth/google/callback/route.ts
- src/app/auth/google/start/route.ts
- src/app/global-error.tsx
- src/app/globals.css
- src/app/layout.tsx
- src/app/login/page.tsx
- src/components/AccountProfile.tsx
- src/components/CategoriesGrid.tsx
- src/components/CollectionCard.tsx
- src/components/ErrorBoundary.tsx
- src/components/FilterSidebar.tsx
- src/components/Footer.tsx
- src/components/Header.tsx
- src/components/HomeProductCarousel.tsx
- src/components/HomepageBackground.tsx
- src/components/LogoutButton.tsx
- src/components/ProductCard.tsx
- src/components/ProductDetail.tsx
- src/components/ProductReviews.tsx
- src/components/ReviewSubmissionModal.tsx
- src/components/ReviewsMarquee.tsx
- src/components/SiteTheme.tsx
- src/components/StoreExtras.tsx
- src/components/admin/AdminShell.tsx
- src/components/admin/ImageUpload.tsx
- src/components/admin/ProductForm.tsx
- src/components/admin/ResponsiveTable.tsx
- src/context/cart.tsx
- src/context/settings.tsx
- src/context/wishlist.tsx
- src/db/index.ts
- src/db/schema.ts
- src/lib/auth.ts
- src/lib/constants.ts
- src/lib/storage.ts
- src/lib/upload-client.ts
- src/lib/utils.ts
- src/lib/validations.ts
- tsconfig.json

## Excluded categories

- Environment secrets and local environment files: `.env.local` and all `.env*` files except the sanitized `.env.example`; private keys and credential files.
- Dependencies and generated output: `node_modules/`, `.next/`, `.git/`, and `*.tsbuildinfo` (including `tsconfig.tsbuildinfo`).
- New/local upload assets are excluded. The five files already tracked on GitHub `main` were restored unchanged so this release preserves them; `/public/uploads/` is ignored for future additions.
- Review-held files: `src/db/seed.ts`, `DEPLOYMENT.md`, `GOOGLE_SIGN_IN.md`, and `LAUNCH_AUDIT_PROGRESS.md`.
- Temporary scripts: `check-phone-models.cjs`, `create-phone-models.cjs`, `seed-phone-models.cjs`, `fix-quotes*.js`, `migrate.js`, and `test-entity.js`.

## Required and deferred deletions

- DELETE `drizzle.config.json`: intentionally absent from this export; the replacement `drizzle.config.ts` reads `DATABASE_URL` from the environment. The old tracked file had a database credential; rotate that credential before publishing. No secret value is included here.
- DELETE `src/components/admin/AdminShell.tsx.backup` and `src/components/admin/AdminShell.tsx.broken-backup`: these backup files were already absent from the source working tree and are omitted.
- DEFER deletion of `public/uploads/1786494737858-3342ceb027e373b7.png` until its database references are checked. The five files already tracked on GitHub are preserved in this export; other local upload files remain omitted from the export and untouched in the source project.

## Migration note

The existing migration SQL and journal are included. Only Drizzle snapshots 0000 and 0001 exist; this export does not invent snapshots for 0002–0007. Review staging database state and migration effects before running any migration.

- Git-ignore rule: /public/uploads/ excludes local upload files from commits made from this export folder.
