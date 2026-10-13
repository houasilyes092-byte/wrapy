"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef } from "react";

interface CollectionCardProps {
  name: string;
  slug: string;
  description: string | null;
  coverImage: string | null;
}

export default function CollectionCard({
  name,
  slug,
  description,
  coverImage,
}: CollectionCardProps) {
  const parallaxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) return;

    let frame = 0;
    const updatePosition = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const element = parallaxRef.current;
        const card = element?.parentElement;
        if (!element || !card) return;
        const bounds = card.getBoundingClientRect();
        if (bounds.bottom < 0 || bounds.top > window.innerHeight) return;
        const distance = bounds.top + bounds.height / 2 - window.innerHeight / 2;
        const offset = Math.max(-32, Math.min(32, -distance * 0.06));
        element.style.transform = `translate3d(0, ${offset}px, 0) scale(1.12)`;
      });
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, { passive: true });
    window.addEventListener("resize", updatePosition);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updatePosition);
      window.removeEventListener("resize", updatePosition);
    };
  }, []);

  return (
    <Link
      href={`/collections/${slug}`}
      className="group relative isolate block rounded-2xl overflow-hidden bg-dark border border-dark-border hover:border-brand/30 hover:bg-dark-card transition-all duration-300 text-center min-h-[280px] sm:min-h-[320px] lg:min-h-[360px]"
    >
      {coverImage && (
        <div className="absolute inset-0 z-0">
          <div ref={parallaxRef} className="collection-bg absolute inset-0 will-change-transform" style={{ transform: "translate3d(0, 0, 0) scale(1.12)" }}>
            <Image
              src={coverImage}
              alt=""
              fill
              className="object-cover blur-[1px] opacity-85 transition-opacity duration-500 group-hover:opacity-95"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1366px) 33vw, 25vw"
              priority={false}
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-dark/80 via-dark/35 to-dark/10" />
        </div>
      )}
      <div className="relative z-10 p-5 sm:p-6 flex flex-col justify-end min-h-[280px] sm:min-h-[320px] lg:min-h-[360px]">
        <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-brand transition-colors mb-2">
          {name}
        </h3>
        {description && (
          <p className="text-xs sm:text-sm text-gray-400 line-clamp-2">
            {description}
          </p>
        )}
      </div>
    </Link>
  );
}
