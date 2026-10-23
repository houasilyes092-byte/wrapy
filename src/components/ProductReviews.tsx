"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Star, ChevronDown, BadgeCheck } from "lucide-react";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  title: string | null;
  customerName: string | null;
  createdAt: Date | string;
  verifiedPurchase: boolean;
};

interface ProductReviewsProps {
  productId: string;
  reviews: Review[];
  /** Server-side view of the visitor: who may write, and where to sign in. */
  viewer: { signedIn: boolean; alreadyReviewed: boolean };
  loginHref: string;
}

export default function ProductReviews({ productId, reviews: initialReviews, viewer, loginHref }: ProductReviewsProps) {
  const [sort, setSort] = useState("newest");
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const REVIEWS_PER_PAGE = 5;

  const average = initialReviews.length
    ? initialReviews.reduce((sum, review) => sum + review.rating, 0) / initialReviews.length
    : 0;

  const ratingDistribution = [5, 4, 3, 2, 1].map((stars) => {
    const count = initialReviews.filter((r) => r.rating === stars).length;
    const percentage = initialReviews.length ? (count / initialReviews.length) * 100 : 0;
    return { stars, count, percentage };
  });

  const sortedReviews = useMemo(
    () => [...initialReviews].sort((a, b) =>
      sort === "highest"
        ? b.rating - a.rating
        : sort === "lowest"
          ? a.rating - b.rating
          : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
    [initialReviews, sort]
  );

  const initialDisplayed = sortedReviews.slice(0, REVIEWS_PER_PAGE);
  const initialHasMore = sortedReviews.length > REVIEWS_PER_PAGE;
  const [displayedReviews, setDisplayedReviews] = useState<Review[]>(initialDisplayed);
  const [hasMore, setHasMore] = useState(initialHasMore);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDisplayedReviews(sortedReviews.slice(0, REVIEWS_PER_PAGE));

    setHasMore(sortedReviews.length > REVIEWS_PER_PAGE);
  }, [sortedReviews]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const name = customerName.replace(/\s+/g, " ").trim();
    if (!name) {
      setError("Indiquez votre nom.");
      return;
    }
    if ([...name].length > 50) {
      setError("Votre nom ne peut pas dépasser 50 caractères.");
      return;
    }
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, rating, title, comment, customerName: name }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Impossible d'envoyer votre avis.");
      setTitle("");
      setComment("");
      setCustomerName("");
      setSubmitted(true);
      setMessage("Merci ! Votre avis sera visible après validation.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau.");
    } finally {
      setBusy(false);
    }
  }

  function loadMore() {
    const next = displayedReviews.length + REVIEWS_PER_PAGE;
    setDisplayedReviews(sortedReviews.slice(0, next));
    setHasMore(next < sortedReviews.length);
  }

  return (
    <section className="mt-16" aria-labelledby="reviews-title">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h2 id="reviews-title" className="text-2xl font-bold text-white">
            Avis clients
          </h2>
          <p className="mt-1 text-sm text-dark-muted">
            {initialReviews.length
              ? `${average.toFixed(1)} / 5 · ${initialReviews.length} avis`
              : "Aucun avis publié pour le moment. Soyez le premier à donner le vôtre."}
          </p>
        </div>
        {initialReviews.length > 1 && (
          <label className="text-sm text-dark-muted">
            Trier
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="ml-2 min-h-11 rounded-lg border border-dark-border bg-dark-card px-3 text-white"
            >
              <option value="newest">Plus récents</option>
              <option value="highest">Mieux notés</option>
              <option value="lowest">Moins bien notés</option>
            </select>
          </label>
        )}
      </div>

      {initialReviews.length > 0 && (
        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <div className="text-4xl font-bold text-white">{average.toFixed(1)}</div>
            <div className="flex items-center gap-2 mt-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  className={`h-6 w-6 ${n <= Math.round(average) ? "fill-brand text-brand" : "text-dark-border"}`}
                />
              ))}
              <span className="text-sm text-dark-muted">({initialReviews.length} avis)</span>
            </div>
          </div>
          <div className="lg:col-span-4 space-y-2">
            {ratingDistribution.map(({ stars, count, percentage }) => (
              <div key={stars} className="flex items-center gap-3">
                <span className="w-8 text-right text-sm text-dark-muted">{stars}★</span>
                <div className="flex-1 h-2 bg-dark rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="w-16 text-sm text-dark-muted">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {submitted ? (
        <p role="status" className="mb-8 rounded-2xl border border-brand/20 bg-brand/10 p-5 text-sm text-brand">{message}</p>
      ) : !viewer.signedIn ? (
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dark-border bg-dark-card p-5">
          <p className="text-sm text-gray-300">Connectez-vous pour donner votre avis sur ce skin.</p>
          <Link href={loginHref} className="inline-flex min-h-11 items-center rounded-xl bg-brand px-5 text-sm font-bold text-black">Se connecter</Link>
        </div>
      ) : viewer.alreadyReviewed ? (
        <p className="mb-8 rounded-2xl border border-dark-border bg-dark-card p-5 text-sm text-dark-muted">
          Vous avez déjà donné votre avis sur ce produit. Merci !
        </p>
      ) : (
      <form onSubmit={submit} className="mb-8 rounded-2xl border border-dark-border bg-dark-card p-5" aria-label="Écrire un avis">
        <p className="mb-2 text-sm font-medium text-white">Votre note</p>
        <div className="mb-4 flex gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              aria-label={`${value} étoiles`}
              aria-pressed={rating === value}
              className="flex h-11 w-11 items-center justify-center rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
            >
              <Star className={`h-6 w-6 ${value <= rating ? "fill-brand text-brand" : "text-gray-500"}`} />
            </button>
          ))}
        </div>
        <div className="mb-4">
          <label htmlFor="review-name" className="block text-xs text-dark-muted mb-1.5">
            Votre nom <span className="text-brand">*</span>
          </label>
          <input
            id="review-name"
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            required
            maxLength={50}
            autoComplete="nickname"
            placeholder="Nom affiché avec votre avis"
            className="w-full rounded-xl border border-dark-border bg-dark px-4 py-3 text-sm text-white placeholder:text-dark-muted focus:outline-none focus:border-brand/50"
          />
        </div>
        <div className="mb-4">
          <label htmlFor="review-title" className="block text-xs text-dark-muted mb-1.5">
            Titre (optionnel)
          </label>
          <input
            id="review-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            placeholder="Résumé de votre expérience"
            className="w-full rounded-xl border border-dark-border bg-dark px-4 py-3 text-sm text-white placeholder:text-dark-muted focus:outline-none focus:border-brand/50"
          />
        </div>
        <label className="block text-xs text-dark-muted mb-1.5" htmlFor="review-comment">
          Votre avis
        </label>
        <textarea
          id="review-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          required
          minLength={3}
          maxLength={2000}
          rows={3}
          placeholder="Partagez votre expérience après réception de votre commande"
          className="w-full rounded-xl border border-dark-border bg-dark p-3 text-sm text-white placeholder:text-dark-muted focus:outline-none focus:border-brand/50"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-dark-muted">
            Les avis sont publiés après validation par l&apos;équipe Wrapy.
          </p>
          <button disabled={busy} className="min-h-11 rounded-xl bg-brand px-5 text-sm font-bold text-black disabled:opacity-50">
            {busy ? "Envoi…" : "Envoyer mon avis"}
          </button>
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-red-400">{error}</p>}
      </form>
      )}

      {displayedReviews.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-4">
            {displayedReviews.map((review) => (
              <article key={review.id} className="animate-fade-in rounded-2xl border border-dark-border bg-dark-card p-5">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex gap-1" aria-label={`${review.rating} étoiles sur 5`}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={`h-4 w-4 ${n <= review.rating ? "fill-brand text-brand" : "text-dark-border"}`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-dark-muted whitespace-nowrap">
                    {new Date(review.createdAt).toLocaleDateString("fr-FR")}
                  </span>
                </div>
                {review.title && <h3 className="mb-2 font-semibold text-white text-sm">{review.title}</h3>}
                {review.comment && <p className="mb-4 text-sm leading-relaxed text-gray-300">{review.comment}</p>}
                <p className="flex flex-wrap items-center gap-2 text-xs text-dark-muted">
                  {review.customerName || "Client"}
                  {review.verifiedPurchase && (
                    <span className="inline-flex items-center gap-1 text-brand">
                      <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      Achat vérifié
                    </span>
                  )}
                </p>
              </article>
            ))}
          </div>
          {hasMore && (
            <div className="text-center">
              <button
                onClick={loadMore}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-dark-border bg-dark-card text-white hover:border-brand/50 hover:bg-brand/10 transition-all"
              >
                <ChevronDown className="w-4 h-4" />
                Voir plus d&apos;avis
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
