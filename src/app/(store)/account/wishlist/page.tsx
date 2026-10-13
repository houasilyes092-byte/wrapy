"use client";

import { useWishlist } from "@/context/wishlist";
import ProductCard from "@/components/ProductCard";
import Link from "next/link";
import { Heart, Loader2 } from "lucide-react";

export default function WishlistPage() {
  const { items, loading } = useWishlist();

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-dark-muted flex items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-brand" />
        <span>Loading wishlist...</span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link href="/account" className="text-xs text-dark-muted hover:text-white transition-colors mb-4 block">
        ← Back to Account
      </Link>
      <h1 className="text-3xl font-bold text-white tracking-tight mb-8">My Wishlist</h1>

      {items.length === 0 ? (
        <div className="text-center py-20">
          <Heart className="w-16 h-16 text-dark-border mx-auto mb-4" />
          <p className="text-dark-muted mb-4">Your wishlist is empty</p>
          <Link href="/skins" className="text-sm text-brand">
            Browse Skins →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {items.map((item) => (
            <ProductCard
              key={item.productId}
              product={{
                id: item.productId,
                name: item.productName,
                slug: item.slug,
                price: item.price,
                comparePrice: null,
                images: [item.productImage],
                isBestSeller: false,
                isFeatured: false,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}