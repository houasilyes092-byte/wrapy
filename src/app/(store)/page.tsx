import Link from "next/link";
import Image from "next/image";
import { db } from "@/db";
import { products, collections, reviews, settings } from "@/db/schema";
import { eq, desc, asc, and, sql } from "drizzle-orm";
import HomeProductCarousel from "@/components/HomeProductCarousel";
import { Shield, Smartphone, Sparkles, Zap, Palette, ChevronDown, ChevronUp } from "lucide-react";
import { FAQSection, TutorialSection, type FaqItem } from "@/components/StoreExtras";
import { getPublishedFaq } from "@/lib/faq";
import HomeReviews, { type HomeReview } from "@/components/HomeReviews";
import { CategoriesGrid, type CategoryCard } from "@/components/CategoriesGrid";
import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Phone Skins in Tunisia | iPhone & Samsung Skins",
  description: "Premium precision-cut vinyl phone skins for iPhone and Samsung, delivered across Tunisia with cash on delivery.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const featuredProducts = await db
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
    .where(and(eq(products.isActive, true), eq(products.isDeleted, false)))
    .orderBy(
      desc(sql`(${products.isFeatured}::int + ${products.isBestSeller}::int)`),
      desc(products.isFeatured),
      desc(products.createdAt),
    )
    .limit(8);

  const allCollections = await db
    .select()
    .from(collections)
    .where(eq(collections.isActive, true))
    .orderBy(asc(collections.sortOrder), asc(collections.name));
  // Live product count per collection, shown on the category cards.
  const collectionCounts = await db
    .select({ collectionId: products.collectionId, count: sql<number>`count(*)` })
    .from(products)
    .where(and(eq(products.isActive, true), eq(products.isDeleted, false)))
    .groupBy(products.collectionId);
  const countFor = (id: string) => Number(collectionCounts.find((c) => c.collectionId === id)?.count || 0);
  const featuredCollections: CategoryCard[] = allCollections
    .filter((c) => c.isFeatured)
    .map((c) => ({ id: c.id, name: c.name, slug: c.slug, description: c.description, images: c.images, productCount: countFor(c.id) }));

  const activeProducts = await db
    .select({
      id: products.id,
      name: products.name,
    })
    .from(products)
    .where(and(eq(products.isActive, true), eq(products.isDeleted, false)))
    .orderBy(products.name);

  // Approved reviews only. "Show on homepage" pins a review to the front;
  // without it the newest approved reviews are shown.
  const approvedReviews: HomeReview[] = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      title: reviews.title,
      customerName: reviews.customerName,
      productName: products.name,
      productSlug: products.slug,
      createdAt: reviews.createdAt,
      verifiedPurchase: sql<boolean>`exists (select 1 from orders o join order_items oi on oi.order_id = o.id where o.user_id = ${reviews.userId} and oi.product_id = ${reviews.productId} and o.status = 'delivered')`,
    })
    .from(reviews)
    .innerJoin(products, eq(reviews.productId, products.id))
    .where(and(
      eq(reviews.isApproved, true),
      eq(products.isDeleted, false),
    ))
    .orderBy(desc(reviews.isHomepage), desc(reviews.createdAt))
    .limit(12);
  const [reviewStats] = await db
    .select({ count: sql<number>`count(*)`, average: sql<number>`coalesce(avg(${reviews.rating}), 0)` })
    .from(reviews)
    .innerJoin(products, eq(reviews.productId, products.id))
    .where(and(eq(reviews.isApproved, true), eq(products.isDeleted, false)));

  const settingRows = await db.select().from(settings);

  const siteSettings: Record<string, string> = {};

  for (const setting of settingRows) {
    siteSettings[setting.key] = setting.value;
  }

  const heroMedia =
    siteSettings.hero_media || siteSettings.hero_image || "";

  const heroMediaType =
    siteSettings.hero_media_type ||
    (siteSettings.hero_media?.match(/\.(mp4|webm)$/i) ? "video" : "image");

  const heroTitle =
    siteSettings.hero_title || "WRAP YOUR WORLD";

  const heroSubtitle =
    siteSettings.hero_subtitle ||
    "Precision-cut vinyl skins crafted for ultimate device protection and distinct style.";

  const heroButtonText =
    siteSettings.hero_button_text || "Shop Skins";

  const heroButtonLink =
    siteSettings.hero_button_link || "/skins";

  // Published FAQ (admin -> FAQ). The homepage shows the first six.
  let publishedFaq: FaqItem[] = [];
  try {
    publishedFaq = await getPublishedFaq();
  } catch (error) {
    console.error("[HOME_FAQ_FAILED]", { name: error instanceof Error ? error.name : "UnknownError" });
  }

  // Get collection names for products
  const collectionMap: Record<string, string> = {};
  for (const c of allCollections) {
    collectionMap[c.id] = c.name;
  }

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c") }} />
      {/* HERO */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          {heroMedia && (heroMediaType === "video" || heroMedia.match(/\.(mp4|webm)$/i)) ? (
            <video
              src={heroMedia}
              className="w-full h-full object-cover opacity-40"
              autoPlay
              muted
              loop
              playsInline
              poster={siteSettings.hero_poster || undefined}
            />
          ) : heroMedia ? (
            <Image
              src={heroMedia}
              alt="Wrapy Hero"
              fill
              className="object-cover opacity-40"
              priority
              sizes="100vw"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-b from-dark/60 via-dark/80 to-dark" />
        </div>
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-brand/10 border border-brand/20 rounded-full px-4 py-1.5 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
            <span className="text-xs text-brand font-medium tracking-wider uppercase">CURATED FOR YOU</span>
          </div>
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tighter text-white leading-[0.9]">
            WRAP YOUR<br />
            <span className="text-brand">WORLD</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-gray-400 max-w-xl mx-auto leading-relaxed">
            {heroSubtitle}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <Link
              href="/skins"
              className="bg-brand hover:bg-brand-dark text-black font-bold px-8 py-4 rounded-xl transition-all duration-200 text-sm uppercase tracking-wider animate-pulse-glow"
            >
              Shop Skins
            </Link>
            <Link
              href="/skins?featured=true"
              className="border border-white/20 hover:border-white/40 text-white px-8 py-4 rounded-xl transition-all duration-200 text-sm uppercase tracking-wider"
            >
              Explore Collections
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/20 rounded-full flex items-start justify-center p-2">
            <div className="w-1 h-2 bg-brand rounded-full" />
          </div>
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-6 sm:mb-12">
          <div>
            <p className="text-xs text-brand font-medium tracking-wider uppercase mb-2">Curated Selection</p>
            <h2 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">Featured Skins</h2>
          </div>
          <Link href="/skins" className="text-sm text-gray-400 hover:text-brand transition-colors hidden sm:block">
            View All →
          </Link>
        </div>
        <HomeProductCarousel products={featuredProducts.map((p) => ({
          ...p,
          collectionName: p.collectionId ? collectionMap[p.collectionId] : undefined,
        }))} />
        <div className="mt-4 text-center sm:hidden">
          <Link href="/skins" className="inline-flex min-h-11 items-center text-sm text-brand font-medium">
            View All Products →
          </Link>
        </div>
      </section>

      <HomeReviews
        reviews={approvedReviews.map((r) => ({ ...r, verifiedPurchase: Boolean(r.verifiedPurchase), productName: r.productName ?? null, productSlug: r.productSlug ?? null }))}
        total={Number(reviewStats?.count || 0)}
        average={Number(reviewStats?.average || 0)}
        products={activeProducts}
      />

      {/* COLLECTIONS: featured only, in the admin's order; hidden when none */}
      {featuredCollections.length > 0 && (
      <section id="collections" className="py-10 sm:py-12 bg-dark-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-4 sm:mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] text-brand font-medium tracking-[0.2em] uppercase mb-1">Collections</p>
              <h2 className="text-lg sm:text-2xl font-bold text-white tracking-tight">Categories</h2>
            </div>
            <Link href="/skins" className="inline-flex min-h-11 shrink-0 items-center text-xs font-medium text-gray-400 transition-colors hover:text-brand">
              View all →
            </Link>
          </div>
          <CategoriesGrid collections={featuredCollections} />
        </div>
      </section>
      )}

      {/* WHY WRAPY */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-8 sm:mb-14">
          <p className="text-xs text-brand font-medium tracking-wider uppercase mb-2">Why Choose Us</p>
          <h2 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">The Wrapy Difference</h2>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:gap-8 lg:grid-cols-5">
          {[
            { icon: Sparkles, title: "Premium Materials", desc: "3M™ quality vinyl that lasts" },
            { icon: Smartphone, title: "Precise Fit", desc: "Laser-cut for every device" },
            { icon: Zap, title: "Easy Install", desc: "Bubble-free application" },
            { icon: Shield, title: "Full Protection", desc: "Scratch & fingerprint resistant" },
            { icon: Palette, title: "Unique Designs", desc: "Exclusive artistic patterns" },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="text-center group last:col-span-2 lg:last:col-span-1">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-brand/10 flex items-center justify-center mx-auto mb-3 sm:mb-4 group-hover:bg-brand/20 transition-colors">
                <Icon className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">{title}</h3>
              <p className="text-xs text-dark-muted">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <TutorialSection videoUrl={siteSettings.tutorial_video_url || ""} />
      <FAQSection items={publishedFaq.slice(0, 6)} total={publishedFaq.length} />

      {/* CTA */}
      <section className="py-24 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-4">
            Ready to <span className="text-brand">Wrap</span>?
          </h2>
          <p className="text-gray-400 mb-8">
            Join thousands who elevated their device with Wrapy premium skins.
          </p>
          <Link
            href="/skins"
            className="inline-flex bg-brand hover:bg-brand-dark text-black font-bold px-10 py-4 rounded-xl transition-all duration-200 text-sm uppercase tracking-wider"
          >
            Shop Now
          </Link>
        </div>
      </section>
    </>
  );
}




