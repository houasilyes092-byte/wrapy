import { db } from "@/db";
import { products, collections, reviews } from "@/db/schema";
import { eq, and, ilike, desc, asc, inArray, sql } from "drizzle-orm";
import ProductCard from "@/components/ProductCard";
import FilterSidebar from "@/components/FilterSidebar";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    collection?: string;
    sort?: string;
    featured?: string;
    bestseller?: string;
  }>;
}

export default async function SkinsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const allCollections = await db
    .select()
    .from(collections)
    .where(eq(collections.isActive, true))
    .orderBy(asc(collections.sortOrder), asc(collections.name));

  // Build conditions
  const conditions = [eq(products.isActive, true), eq(products.isDeleted, false)];

  if (params.featured === "true") {
    conditions.push(eq(products.isFeatured, true));
  }
  if (params.bestseller === "true") {
    conditions.push(eq(products.isBestSeller, true));
  }
  if (params.q) {
    conditions.push(ilike(products.name, `%${params.q}%`));
  }
  if (params.collection) {
    const col = allCollections.find((c) => c.slug === params.collection);
    if (col) {
      conditions.push(eq(products.collectionId, col.id));
    }
  }

  // Sort
  let orderBy;
  switch (params.sort) {
    case "price-asc":
      orderBy = asc(products.price);
      break;
    case "price-desc":
      orderBy = desc(products.price);
      break;
    case "newest":
      orderBy = desc(products.createdAt);
      break;
    default:
      orderBy = desc(products.isFeatured);
  }

  const allProducts = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      price: products.price,
      comparePrice: products.comparePrice,
      images: products.images,
      isBestSeller: products.isBestSeller,
      isFeatured: products.isFeatured,
      collectionId: products.collectionId,
    })
    .from(products)
    .where(and(...conditions))
    .orderBy(orderBy);

  if (params.sort === "rating" && allProducts.length) {
    const ids = allProducts.map((product) => product.id);
    const [prior] = await db.select({ average: sql<number>`coalesce(avg(${reviews.rating}), 0)` }).from(reviews).where(eq(reviews.isApproved, true));
    const aggregates = await db.select({ productId: reviews.productId, average: sql<number>`avg(${reviews.rating})`, count: sql<number>`count(*)` }).from(reviews).where(and(eq(reviews.isApproved, true), inArray(reviews.productId, ids))).groupBy(reviews.productId);
    const byProduct = new Map(aggregates.map((row) => [row.productId, { average: Number(row.average), count: Number(row.count) }]));
    const priorMean = Number(prior?.average || 0);
    const priorWeight = 5;
    allProducts.sort((a, b) => {
      const ar = byProduct.get(a.id) || { average: 0, count: 0 };
      const br = byProduct.get(b.id) || { average: 0, count: 0 };
      const scoreA = (ar.count * ar.average + priorWeight * priorMean) / (ar.count + priorWeight);
      const scoreB = (br.count * br.average + priorWeight * priorMean) / (br.count + priorWeight);
      return scoreB - scoreA || br.count - ar.count;
    });
  }

  const collectionMap: Record<string, string> = {};
  for (const c of allCollections) {
    collectionMap[c.id] = c.name;
  }

  const title = params.featured === "true"
    ? "Featured Skins"
    : params.bestseller === "true"
    ? "Best Sellers"
    : params.collection
    ? allCollections.find((c) => c.slug === params.collection)?.name || "Skins"
    : "All Skins";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">{title}</h1>
        <p className="text-sm text-dark-muted mt-2">{allProducts.length} products</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filters */}
        <FilterSidebar collections={allCollections} />

        {/* Products */}
        <div className="flex-1">
          {allProducts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-400 text-lg">No products found</p>
              <p className="text-dark-muted text-sm mt-2">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {allProducts.map((p) => (
                <ProductCard
                  key={p.id}
                  product={{
                    ...p,
                    collectionName: p.collectionId ? collectionMap[p.collectionId] : undefined,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
