"use client";

import { useState } from "react";
import { X, Star, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface ReviewSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
}

export default function ReviewSubmissionModal({ isOpen, onClose, productId, productName }: ReviewSubmissionModalProps) {
  const [customerName, setCustomerName] = useState("");
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      setErrorMessage("Please enter your name.");
      return;
    }
    if (rating === 0) {
      setErrorMessage("Please select a rating.");
      return;
    }
    if (!comment.trim()) {
      setErrorMessage("Please write your review.");
      return;
    }

    setStatus("submitting");
    setErrorMessage("");

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, rating, title, comment, customerName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit review");
      }

      setStatus("success");
      setCustomerName("");
      setTitle("");
      setComment("");
      setRating(0);

      setTimeout(() => {
        onClose();
        setStatus("idle");
      }, 3000);
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Failed to submit review. Please try again.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-md bg-dark-card border border-dark-border rounded-2xl p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-dark-muted hover:text-white transition-colors p-1"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {status === "success" ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-400/10 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Review Submitted!</h3>
            <p className="text-dark-muted mb-6">
              Thank you for your review. It will appear on the site once approved by our team.
            </p>
            <button
              onClick={onClose}
              className="bg-brand hover:bg-brand-dark text-black font-bold px-6 py-3 rounded-xl transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <h3 className="text-xl font-bold text-white mb-1">Leave a Review</h3>
              <p className="text-sm text-dark-muted">Reviewing: <span className="text-brand font-medium">{productName}</span></p>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="customerName" className="block text-sm font-medium text-white mb-1.5">
                  Your Name <span className="text-brand">*</span>
                </label>
                <input
                  id="customerName"
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="John Doe"
                  maxLength={100}
                  required
                  disabled={status === "submitting"}
                  className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-white placeholder:text-dark-muted focus:outline-none focus:border-brand/50 disabled:opacity-50 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1.5">
                  Rating <span className="text-brand">*</span>
                </label>
                <div className="flex gap-1" role="radiogroup" aria-label="Rating">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setRating(i + 1)}
                      onMouseEnter={() => setHoverRating(i + 1)}
                      onMouseLeave={() => setHoverRating(0)}
                      disabled={status === "submitting"}
                      className="p-1 transition-transform hover:scale-110 disabled:opacity-50"
                      aria-label={`${i + 1} star${i > 0 ? "s" : ""}`}
                    >
                      <Star
                        className={`w-8 h-8 ${
                          i < (hoverRating || rating)
                            ? "text-brand fill-current"
                            : "text-dark-border"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="title" className="block text-sm font-medium text-white mb-1.5">
                  Title (optional)
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Summarize your experience..."
                  maxLength={100}
                  disabled={status === "submitting"}
                  className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-white placeholder:text-dark-muted focus:outline-none focus:border-brand/50 disabled:opacity-50 transition-colors"
                />
              </div>

              <div>
                <label htmlFor="comment" className="block text-sm font-medium text-white mb-1.5">
                  Your Review <span className="text-brand">*</span>
                </label>
                <textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your experience with this product..."
                  maxLength={2000}
                  rows={4}
                  required
                  disabled={status === "submitting"}
                  className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-white placeholder:text-dark-muted focus:outline-none focus:border-brand/50 disabled:opacity-50 transition-colors resize-none"
                />
                <p className="text-xs text-dark-muted mt-1 text-right">
                  {comment.length}/2000
                </p>
              </div>

              {errorMessage && (
                <div className="flex items-center gap-2 p-3 bg-red-400/10 border border-red-400/20 rounded-xl text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={status === "submitting"}
                className="w-full bg-brand hover:bg-brand-dark text-black font-bold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {status === "submitting" ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Review"
                )}
              </button>

              <p className="text-xs text-dark-muted text-center">
                Your review will be published after moderation. We don&apos;t publish reviews automatically.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}