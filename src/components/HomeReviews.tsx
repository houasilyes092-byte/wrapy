"use client";

import { useState } from "react";
import Link from "next/link";
import { Star, Pen, BadgeCheck, ArrowRight } from "lucide-react";
import ReviewSubmissionModal from "./ReviewSubmissionModal";

export type HomeReview = {
  id: string;
  rating: number;
  comment: string | null;
  title: string | null;
  customerName: string | null;
  productName: string | null;
  productSlug: string | null;
  createdAt: Date | string;
  verifiedPurchase: boolean;
};

type ProductForReview = { id: string; name: string };

function Stars({ rating, size = "h-3.5 w-3.5" }: { rating: number; size?: string }) {
  return (
    <span className="flex gap-0.5" role="img" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`${size} ${n <= Math.round(rating) ? "fill-brand text-brand" : "text-dark-border"}`} aria-hidden="true" />
      ))}
    </span>
  );
}

/**
 * Homepage reviews: approved reviews only (the server filters them).
 * Phone: a native horizontal swipe row with snap points (touch, trackpad and
 * keyboard scrolling all work; no auto-play). Tablet/desktop: a 3-column grid.
 */
export default function HomeReviews({
  reviews,
  total,
  average,
  products,
}: {
  reviews: HomeReview[];
  total: number;
  average: number;
  products: ProductForReview[];
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(products[0]?.id ?? "");
  const selected = products.find((p) => p.id === selectedId) ?? products[0];

  return (
    <section className="py-12 sm:py-16" aria-labelledby="home-reviews-title">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-6">
          <div>
            <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.2em] text-brand">Testimonials</p>
            <h2 id="home-reviews-title" className="text-lg font-bold tracking-tight text-white sm:text-2xl">
              Customer Reviews
            </h2>
          </div>
          {total > 0 && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Stars rating={average} />
              <span>
                <span className="font-semibold text-white">{average.toFixed(1)}</span> · {total} review{total > 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>

        {reviews.length === 0 ? (
          <div className="rounded-xl border border-dashed border-dark-border bg-dark-card/60 px-5 py-8 text-center">
            <p className="text-sm text-gray-300">No reviews yet.</p>
            <p className="mt-1 text-xs text-dark-muted">Be the first to share your experience with a Wrapy skin.</p>
          </div>
        ) : (
          <ul
            className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3 [&::-webkit-scrollbar]:hidden"
            tabIndex={0}
            aria-label="Approved customer reviews"
          >
            {reviews.map((review) => (
              <li key={review.id} className="w-[82%] max-w-[320px] shrink-0 snap-start sm:w-auto sm:max-w-none">
                <article className="flex h-full flex-col rounded-xl border border-white/[0.08] bg-dark-card p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <Stars rating={review.rating} />
                    {review.verifiedPurchase && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-brand">
                        <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> Verified purchase
                      </span>
                    )}
                  </div>
                  {review.title && <h3 className="mb-1 line-clamp-1 text-sm font-semibold text-white">{review.title}</h3>}
                  {review.comment && <p className="line-clamp-4 text-sm leading-relaxed text-gray-300">{review.comment}</p>}
                  <div className="mt-auto flex items-end justify-between gap-3 pt-3">
                    <p className="min-w-0 truncate text-xs font-medium text-white/80">{review.customerName || "Customer"}</p>
                    {review.productSlug && review.productName && (
                      <Link
                        href={`/skins/${review.productSlug}`}
                        className="inline-flex min-h-8 max-w-[60%] shrink-0 items-center gap-1 text-[11px] text-gray-400 transition-colors hover:text-brand"
                      >
                        <span className="truncate">{review.productName}</span>
                        <ArrowRight className="h-3 w-3 shrink-0" aria-hidden="true" />
                      </Link>
                    )}
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}

        {products.length > 0 && (
          <div className="mt-6 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-center sm:gap-3">
            {products.length > 1 && (
              <label className="flex items-center gap-2 text-sm text-dark-muted">
                <span className="shrink-0">Product</span>
                <select
                  value={selected?.id}
                  onChange={(event) => setSelectedId(event.target.value)}
                  className="min-h-11 w-full min-w-0 rounded-xl border border-dark-border bg-dark-card px-3 text-white sm:w-auto sm:max-w-[18rem]"
                >
                  {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                </select>
              </label>
            )}
            <button
              type="button"
              onClick={() => selected && setModalOpen(true)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-brand/30 bg-brand/10 px-5 text-sm font-semibold text-brand transition-colors hover:bg-brand/20"
            >
              <Pen className="h-4 w-4" aria-hidden="true" />
              Write a review
            </button>
          </div>
        )}
      </div>

      {modalOpen && selected && (
        <ReviewSubmissionModal isOpen={modalOpen} onClose={() => setModalOpen(false)} productId={selected.id} productName={selected.name} />
      )}
    </section>
  );
}
