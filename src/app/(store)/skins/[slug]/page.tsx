import { db } from "@/db";
import { products, collections, reviews } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import ProductDetail from "@/components/ProductDetail";
import ProductReviews from "@/components/ProductReviews";
import { getSession } from "@/lib/auth";
import { getApprovedReviews, type PublicReview } from "@/lib/reviews";
import type { Metadata } from "next";
import { absoluteImageUrl, absoluteUrl, SITE_NAME } from "@/lib/site";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getPublicProduct(slug: string) {
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.slug, slug), eq(products.isActive, true), eq(products.isDeleted, false)))
    .limit(1);
  return product ?? null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getPublicProduct(slug);
  if (!product) return { title: "Skin not found", robots: { index: false, follow: true } };

  const name = product.name.trim();
  const description = (product.description?.trim() || `${name}: premium precision-cut vinyl phone skin for iPhone and Samsung, with cash on delivery in Tunisia.`).slice(0, 300);
  const image = product.images?.[0];
  return {
    title: `${name} Phone Skin | iPhone & Samsung`,
    description,
    alternates: { canonical: `/skins/${product.slug}` },
    openGraph: {
      title: `${name} | ${SITE_NAME}`,
      description,
      url: `/skins/${product.slug}`,
      type: "website",
      ...(image ? { images: [{ url: absoluteImageUrl(image), alt: name }] } : {}),
    },
  };
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

  const name = product.name.trim();
  const available = product.madeToOrder || product.stock > 0;
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    url: absoluteUrl(`/skins/${product.slug}`),
    ...(product.description?.trim() ? { description: product.description.trim().slice(0, 500) } : {}),
    ...(product.images?.[0] ? { image: [absoluteImageUrl(product.images[0])] } : {}),
    ...(collectionName ? { category: collectionName } : {}),
    brand: { "@type": "Brand", name: SITE_NAME },
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/skins/${product.slug}`),
      priceCurrency: "TND",
      price: (product.price / 1000).toFixed(3),
      availability: available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: SITE_NAME },
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd).replace(/</g, "\\u003c") }} />
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
