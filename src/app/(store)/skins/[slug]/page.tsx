import { db } from "@/db";
import { products, collections } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import ProductDetail from "@/components/ProductDetail";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;

  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.slug, slug), eq(products.isActive, true), eq(products.isDeleted, false)))
    .limit(1);

  if (!product) notFound();

  let collectionName: string | null = null;
  if (product.collectionId) {
    const [col] = await db
      .select({ name: collections.name })
      .from(collections)
      .where(eq(collections.id, product.collectionId))
      .limit(1);
    collectionName = col?.name || null;
  }

  // Get related products (same collection)
  const related = product.collectionId
    ? await db
        .select({
          id: products.id,
          name: products.name,
          slug: products.slug,
          price: products.price,
          comparePrice: products.comparePrice,
          images: products.images,
          isBestSeller: products.isBestSeller,
          isFeatured: products.isFeatured,
        })
        .from(products)
        .where(
          and(
            eq(products.collectionId, product.collectionId),
            eq(products.isActive, true),
            eq(products.isDeleted, false)
          )
        )
        .limit(4)
    : [];

  return (
    <ProductDetail
      product={product}
      collectionName={collectionName}
      relatedProducts={related.filter((p) => p.id !== product.id)}
    />
  );
}
