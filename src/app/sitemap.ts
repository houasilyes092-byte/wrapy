import type { MetadataRoute } from "next";
import { db } from "@/db";
import { products, collections } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { absoluteUrl } from "@/lib/site";

// Read from the database on every request so new products appear without a redeploy.
export const dynamic = "force-dynamic";

// Public pages only: the home page, the storefront listing, active categories
// and products that are active and not deleted. Admin, account, cart, checkout,
// login and order pages are never listed.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [activeCollections, activeProducts] = await Promise.all([
    db
      .select({ slug: collections.slug })
      .from(collections)
      .where(eq(collections.isActive, true)),
    db
      .select({ slug: products.slug, updatedAt: products.updatedAt })
      .from(products)
      .where(and(eq(products.isActive, true), eq(products.isDeleted, false))),
  ]);

  return [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/skins"), changeFrequency: "weekly", priority: 0.9 },
    { url: absoluteUrl("/faq"), changeFrequency: "monthly", priority: 0.4 },
    ...activeCollections.map((collection) => ({
      url: absoluteUrl(`/collections/${encodeURIComponent(collection.slug)}`),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...activeProducts.map((product) => ({
      url: absoluteUrl(`/skins/${encodeURIComponent(product.slug)}`),
      lastModified: product.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
