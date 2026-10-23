"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, ShoppingBag, Loader2 } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useWishlist } from "@/context/wishlist";

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    comparePrice: number | null;
    images: string[];
    isBestSeller: boolean;
    isFeatured: boolean;
    collectionName?: string;
  };
}

export default function ProductCard({ product }: ProductCardProps) {
  const { isInWishlist, toggleItem, loading } = useWishlist();
  const mainImage = product.images[0] || "/placeholder.svg";
  const inWishlist = isInWishlist(product.id);
  const [toggling, setToggling] = useState(false);

  const discount =
    product.comparePrice && product.comparePrice > product.price
      ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
      : null;

  const handleWishlistToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (toggling || loading) return;

    setToggling(true);
    try {
      await toggleItem({
        productId: product.id,
        productName: product.name,
        productImage: mainImage,
        price: product.price,
        slug: product.slug,
      });
    } catch (error) {
      console.error("Wishlist toggle failed:", error);
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="group relative bg-dark-card rounded-2xl overflow-hidden border border-dark-border hover:border-dark-muted/50 transition-all duration-300">
      {/* Badges */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
        {product.isBestSeller && (
          <span className="bg-brand text-black text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            Best Seller
          </span>
        )}
        {discount && (
          <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            -{discount}%
          </span>
        )}
      </div>

      {/* Wishlist */}
      <button
        onClick={handleWishlistToggle}
        disabled={toggling || loading}
        className={`touch-visible-action absolute top-3 right-3 z-10 p-3 rounded-full bg-black/50 transition-colors opacity-0 group-hover:opacity-100 min-w-[44px] min-h-[44px] flex items-center justify-center ${
          inWishlist
            ? "text-brand hover:text-brand/80 hover:bg-brand/10"
            : "text-gray-400 hover:text-brand hover:bg-black/70"
        } ${toggling || loading ? "opacity-50 cursor-wait" : ""}`}
        aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
        aria-pressed={inWishlist}
      >
        {toggling ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Heart className={`w-5 h-5 ${inWishlist ? "fill-current" : ""}`} />
        )}
      </button>

      {/* Image */}
      <Link href={`/skins/${product.slug}`}>
        <div className="relative aspect-square overflow-hidden bg-dark">
          <Image
            src={mainImage}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        </div>
      </Link>

      {/* Info */}
      <div className="p-4 sm:p-5">
        {product.collectionName && (
          <p className="text-[11px] text-dark-muted uppercase tracking-wider mb-1.5">
            {product.collectionName}
          </p>
        )}
        <Link href={`/skins/${product.slug}`}>
          <h3 className="text-sm font-semibold text-white hover:text-brand transition-colors truncate">
            {product.name}
          </h3>
        </Link>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-sm font-bold text-white">
            {formatPrice(product.price)}
          </span>
          {product.comparePrice && product.comparePrice > product.price && (
            <span className="text-xs text-dark-muted line-through">
              {formatPrice(product.comparePrice)}
            </span>
          )}
        </div>

        {/* Quick add */}
        <Link
          href={`/skins/${product.slug}`}
          className="mt-4 w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-brand hover:text-black text-white text-sm font-medium py-3.5 rounded-xl transition-all duration-200 min-h-[48px]"
        >
          <ShoppingBag className="w-4 h-4" />
          View & Add
        </Link>
      </div>
    </div>
  );
}
