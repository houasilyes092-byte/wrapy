"use client";

import { useEffect, useState } from "react";
import ProductCard from "@/components/ProductCard";

type Product = React.ComponentProps<typeof ProductCard>["product"];

export default function HomeProductCarousel({ products }: { products: Product[] }) {
  const [motionAllowed, setMotionAllowed] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: no-preference)");
    const update = () => setMotionAllowed(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  if (!products.length) return <p className="py-8 text-sm text-dark-muted">No skins available yet.</p>;

  const animate = motionAllowed && products.length > 1;
  const cardSet = animate ? [...products, ...products] : products;

  return (
    <div className="home-products-viewport -mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div
        className={`home-products-track flex w-max gap-4 ${animate ? "home-products-animated" : ""}`}
        style={{ animationPlayState: paused ? "paused" : "running" }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
        onPointerCancel={() => setPaused(false)}
      >
        {cardSet.map((product, index) => (
          <div key={`${product.id}-${index}`} className="w-[min(72vw,240px)] shrink-0 sm:w-[260px]">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </div>
  );
}
