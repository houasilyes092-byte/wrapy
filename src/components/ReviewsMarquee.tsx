"use client";

import { useEffect, useState } from "react";
import { Star, Pen, X } from "lucide-react";
import ReviewSubmissionModal from "./ReviewSubmissionModal";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  title: string | null;
  customerName: string | null;
  productName: string | null;
  phoneModel: string | null;
  createdAt: Date | string;
};

type ProductForReview = {
  id: string;
  name: string;
};

interface ReviewsMarqueeProps {
  reviews: Review[];
  products?: ProductForReview[];
}

export default function ReviewsMarquee({ reviews: initialReviews, products = [] }: ReviewsMarqueeProps) {
  const [shouldAnimate, setShouldAnimate] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductForReview | null>(products[0] || null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => setShouldAnimate(!mediaQuery.matches);
    handleChange();
    mediaQuery.addEventListener?.("change", handleChange);
    return () => mediaQuery.removeEventListener?.("change", handleChange);
  }, []);

  const reviews = [...initialReviews, ...initialReviews];

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`w-4 h-4 ${i < rating ? "text-brand fill-current" : "text-dark-border"}`} />
      ))}
    </div>
  );

  const renderReviewCard = (review: Review, index: number) => (
    <div key={index} className="flex-shrink-0 w-[320px] sm:w-[360px] lg:w-[400px] px-4">
      <article className="h-full bg-dark-card rounded-xl border border-dark-border p-4 sm:p-5 transition-all duration-200 hover:border-brand/30">
        {review.title && (
          <h4 className="text-sm font-medium text-white mb-1.5 line-clamp-1">{review.title}</h4>
        )}
        {review.comment && (
          <p className="text-sm text-gray-300 mb-3 leading-relaxed line-clamp-3">{review.comment}</p>
        )}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            {renderStars(review.rating)}
            <span className="text-xs text-dark-muted">
              {review.customerName || "Customer"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-dark-muted flex-wrap">
            {review.productName && (
              <span className="bg-dark rounded-full px-2 py-0.5 text-white/70">{review.productName}</span>
            )}
            {review.phoneModel && (
              <span className="bg-brand/10 text-brand rounded-full px-2 py-0.5 border border-brand/20">
                {review.phoneModel}
              </span>
            )}
          </div>
        </div>
      </article>
    </div>
  );

  const animationDuration = 50;
  const trackStyle: React.CSSProperties = {
    display: "flex",
    width: "max-content",
    animation: shouldAnimate ? `marquee ${animationDuration}s linear infinite` : "none",
    animationPlayState: shouldAnimate ? "running" : "paused",
  };

  const handleOpenReviewModal = (product: ProductForReview) => {
    setSelectedProduct(product);
    setModalOpen(true);
  };

  return (
    <>
      <section className="py-16 lg:py-20" aria-label="Customer reviews">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-xs text-brand font-medium tracking-wider uppercase mb-2">Testimonials</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{initialReviews.length ? "Loved by Customers" : "Customer Reviews"}</h2>
            {initialReviews.length === 0 && <p className="mt-2 text-sm text-dark-muted">No approved reviews yet.</p>}
          </div>

          {initialReviews.length > 0 && (
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-dark via-dark/50 to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 h-full w-1/4 bg-gradient-to-l from-dark via-dark/50 to-transparent z-10 pointer-events-none" />

            <div className="flex gap-4">
              <div className="flex-1">
                <div
                  className="reviews-marquee-track"
                  style={trackStyle}
                  onMouseEnter={() => setShouldAnimate(false)}
                  onMouseLeave={() => setShouldAnimate(true)}
                  onPointerDown={() => setShouldAnimate(false)}
                  onPointerUp={() => setShouldAnimate(true)}
                  onPointerCancel={() => setShouldAnimate(true)}
                >
                  {reviews.map(renderReviewCard)}
                </div>
              </div>

              <div className="flex-1">
                <div
                  className="reviews-marquee-track"
                  style={{
                    ...trackStyle,
                    animationName: shouldAnimate ? "marquee-reverse" : "none",
                    animationDuration: `${animationDuration}s`,
                    animationTimingFunction: "linear",
                    animationIterationCount: "infinite",
                    animationPlayState: shouldAnimate ? "running" : "paused",
                  }}
                  onMouseEnter={() => setShouldAnimate(false)}
                  onMouseLeave={() => setShouldAnimate(true)}
                  onPointerDown={() => setShouldAnimate(false)}
                  onPointerUp={() => setShouldAnimate(true)}
                  onPointerCancel={() => setShouldAnimate(true)}
                >
                  {reviews.map(renderReviewCard)}
                </div>
              </div>
            </div>
          </div>
          )}

          {products.length > 0 && (
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {products.length > 1 && (
                <label className="flex items-center gap-2 text-sm text-dark-muted">
                  Product
                  <select
                    value={selectedProduct?.id || products[0].id}
                    onChange={(event) => setSelectedProduct(products.find((product) => product.id === event.target.value) || products[0])}
                    className="min-h-11 max-w-[min(70vw,18rem)] rounded-xl border border-dark-border bg-dark-card px-3 text-white"
                  >
                    {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                  </select>
                </label>
              )}
              <button
                onClick={() => selectedProduct && handleOpenReviewModal(selectedProduct)}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-brand/30 bg-brand/10 px-6 py-3 font-semibold text-brand transition-all duration-200 hover:bg-brand/20"
              >
                <Pen className="h-5 w-5" />
                Écrire un avis
              </button>
            </div>
          )}
        </div>
      </section>

      {modalOpen && selectedProduct && (
        <ReviewSubmissionModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
          }}
          productId={selectedProduct.id}
          productName={selectedProduct.name}
        />
      )}
    </>
  );
}
