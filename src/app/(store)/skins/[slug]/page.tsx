import { db } from "@/db";
import { products, collections, reviews } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import ProductDetail from "@/components/ProductDetail";
import ProductReviews from "@/components/ProductReviews";
import { getSession } from "@/lib/auth";
import { getApprovedReviews, type PublicReview } from "@/lib/reviews";

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

  // Reviews must never take the product page down: fall back to an empty list.
  let approvedReviews: PublicReview[] = [];
  let viewer = { signedIn: false, alreadyReviewed: false };
  try {
    const [list, session] = await Promise.all([getApprovedReviews(product.id), getSession()]);
    approvedReviews = list;
    if (session) {
      const [mine] = await db
        .select({ id: reviews.id })
        .from(reviews)
        .where(and(eq(reviews.userId, session.id), eq(reviews.productId, product.id)))
        .limit(1);
      viewer = { signedIn: true, alreadyReviewed: Boolean(mine) };
    }
  } catch (error) {
    console.error("[PRODUCT_REVIEWS_FAILED]", { name: error instanceof Error ? error.name : "UnknownError" });
  }

  return (
    <>
      <ProductDetail
        product={product}
        collectionName={collectionName}
        relatedProducts={related.filter((p) => p.id !== product.id)}
      />
      <div lang="fr" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <ProductReviews
          productId={product.id}
          reviews={approvedReviews}
          viewer={viewer}
          loginHref={`/login?redirect=${encodeURIComponent(`/skins/${product.slug}`)}`}
        />
      </div>
    </>
  );
}
