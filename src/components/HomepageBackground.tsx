"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

interface HomepageBackgroundProps {
  collectionImages: string[];
}

export default function HomepageBackground({ collectionImages }: HomepageBackgroundProps) {
  const parallaxRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;

    let frames: number[] = [];
    const updatePosition = () => {
      frames.forEach((frame) => cancelAnimationFrame(frame));
      frames = [];

      frames = parallaxRefs.current.map((element, index) => {
        if (!element) return 0;
        const card = element.parentElement;
        if (!card) return 0;
        const bounds = card.getBoundingClientRect();
        if (bounds.bottom < 0 || bounds.top > window.innerHeight) return 0;

        const distance = bounds.top + bounds.height / 2 - window.innerHeight / 2;
        const speed = 0.05 + (index * 0.01);
        const maxOffset = 40 + (index * 5);
        const offset = Math.max(-maxOffset, Math.min(maxOffset, -distance * speed));

        element.style.transform = `translate3d(0, ${offset}px, 0) scale(1.15)`;
        return requestAnimationFrame(() => {});
      });
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, { passive: true });
    window.addEventListener("resize", updatePosition);
    return () => {
      frames.forEach((frame) => cancelAnimationFrame(frame));
      window.removeEventListener("scroll", updatePosition);
      window.removeEventListener("resize", updatePosition);
    };
  }, [prefersReducedMotion]);

  if (collectionImages.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none" aria-hidden="true">
      {collectionImages.map((src, index) => (
        <div
          key={src}
          ref={(el) => { parallaxRefs.current[index] = el; }}
          className="absolute inset-0 will-change-transform"
          style={{
            transform: "translate3d(0, 0, 0) scale(1.15)",
            clipPath: `polygon(0 ${index / collectionImages.length * 100}%, 100% ${index / collectionImages.length * 100}%, 100% ${(index + 1) / collectionImages.length * 100}%, 0 ${(index + 1) / collectionImages.length * 100}%)`,
          }}
        >
          <Image
            src={src}
            alt=""
            fill
            className="object-cover blur-[1px] opacity-70"
            sizes="100vw"
            priority={index === 0}
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to bottom,
                rgba(6, 6, 6, 0.9) ${Math.max(0, 20 - index * 5)}%,
                rgba(6, 6, 6, 0.5) 50%,
                rgba(6, 6, 6, 0.1) ${Math.min(100, 80 + index * 5)}%
              )`,
            }}
          />
        </div>
      ))}
      <div className="absolute inset-0 bg-gradient-to-b from-dark/60 via-dark/40 to-dark/80" />
    </div>
  );
}