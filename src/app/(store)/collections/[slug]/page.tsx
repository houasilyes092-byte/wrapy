import { db } from "@/db";
import { products, collections } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import Link from "next/link";
import Image from "next/image";
import { categoryTextureClass } from "@/lib/category-theme";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const [collection] = await db
    .select({ name: collections.name, description: collections.description })
    .from(collections)
    .where(and(eq(collections.slug, slug), eq(collections.isActive, true)))
    .limit(1);
  if (!collection) return { title: "Category not found", robots: { index: false, follow: true } };

  const name = collection.name.trim();
  const description = (collection.description?.trim() || `Shop the ${name} phone skin collection for iPhone and Samsung, delivered across Tunisia.`).slice(0, 300);
  return {
    title: `${name} Phone Skins | iPhone & Samsung`,
    description,
    alternates: { canonical: `/collections/${slug}` },
    openGraph: { title: `${name} | WRAPY`, description, url: `/collections/${slug}`, type: "website" },
  };
}

export default async function CollectionPage({ params }: PageProps) {
  const { slug } = await params;

  const [collection] = await db
    .select()
    .from(collections)
    .where(and(eq(collections.slug, slug), eq(collections.isActive, true)))
    .limit(1);

  if (!collection) notFound();

  const collectionProducts = await db
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
      and(eq(products.collectionId, collection.id), eq(products.isActive, true), eq(products.isDeleted, false))
    );

  const coverImage = collection.images?.[0];
  const galleryImages = collection.images?.slice(1) || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="relative isolate mb-10 min-h-[240px] overflow-hidden rounded-2xl border border-white/[0.07] bg-dark sm:min-h-[360px] lg:min-h-[420px]">
        {/* Same identity as the homepage card, so opening a category feels continuous. */}
        <div className={`absolute inset-0 -z-10 ${categoryTextureClass(collection.slug)} cat-hero-media-in`} aria-hidden="true" />
        {coverImage && (
          <Image
            src={coverImage}
            alt={collection.name}
            fill
            className="cat-hero-media-in object-cover opacity-70"
            priority
            sizes="(max-width: 640px) calc(100vw - 2rem), (max-width: 1300px) calc(100vw - 3rem), 1280px"
          />
        )}
        <div className="absolute inset-0 z-0 bg-gradient-to-r from-dark/90 via-dark/65 to-dark/10" aria-hidden="true" />
        <div className="relative z-10 flex min-h-[240px] items-center px-6 py-10 sm:min-h-[360px] sm:px-10 lg:min-h-[420px]">
          <div className="cat-hero-in">
            <Link href="/skins" className="text-xs text-brand mb-2 block">← All Skins</Link>
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">{collection.name}</h1>
            {collection.description && (
              <p className="text-sm text-gray-400 mt-2 max-w-lg">{collection.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Gallery Images */}
      {galleryImages.length > 0 && (
        <div className="mb-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {galleryImages.map((img, i) => (
            <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-dark border border-dark-border group">
              <Image
                src={img}
                alt={`${collection.name} gallery ${i + 1}`}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />
            </div>
          ))}
        </div>
      )}

      {collectionProducts.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-400">No products in this collection yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {collectionProducts.map((p) => (
            <ProductCard
              key={p.id}
              product={{ ...p, collectionName: collection.name }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
