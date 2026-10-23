"use client";

import { useEffect, useState } from "react";
import ProductCard from "@/components/ProductCard";

type Product = React.ComponentProps<typeof ProductCard>["product"];

/**
 * Featured products row.
 * Mouse devices without reduced motion: a slow auto-scrolling marquee that
 * pauses on hover. Touch devices (and reduced motion): no auto-play, a native
 * swipe row with snap points, so cards never slide away under the thumb.
 */
export default function HomeProductCarousel({ products }: { products: Product[] }) {
  const [motionAllowed, setMotionAllowed] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)");
    const update = () => setMotionAllowed(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  if (!products.length) return <p className="py-8 text-sm text-dark-muted">No skins available yet.</p>;

  const animate = motionAllowed && products.length > 1;

  const renderSet = (copy: boolean) =>
    products.map((product) => (
      <div
        key={`${product.id}-${copy ? "copy" : "main"}`}
        className="w-[min(64vw,240px)] shrink-0 snap-start sm:w-[260px]"
        aria-hidden={copy || undefined}
        inert={copy || undefined}
      >
        <ProductCard product={product} />
      </div>
    ));

  return (
    <div
      className={`home-products-viewport -mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 [&::-webkit-scrollbar]:hidden ${
        animate ? "" : "snap-x snap-mandatory scroll-px-4 sm:scroll-px-6"
      }`}
    >
      <div
        className={`home-products-track flex w-max gap-3 sm:gap-4 ${animate ? "home-products-animated" : ""}`}
        style={animate ? { animationPlayState: paused ? "paused" : "running" } : undefined}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        {renderSet(false)}
        {animate && renderSet(true)}
      </div>
    </div>
  );
}
