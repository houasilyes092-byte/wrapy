"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { categoryTextureClass } from "@/lib/category-theme";

export type CategoryCard = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  images: string[] | null;
  productCount: number;
};

type Phase = "static" | "armed" | "shown";

/**
 * Compact editorial index of the featured categories.
 *
 * Phone: tight 2-column grid of short landscape tiles (several categories
 * visible at once). Tablet/desktop: 4 columns of the same tile, so the section
 * gains width rather than height. No lead card, no scaling or zoom: motion is a
 * one-time fade + 8px rise on reveal, and on mouse devices only the hairline
 * border and the image brightness respond. Reduced motion disables all of it.
 */
export function CategoriesGrid({ collections }: { collections: CategoryCard[] }) {
  const listRef = useRef<HTMLUListElement>(null);
  const [phase, setPhase] = useState<Phase>("static");

  useEffect(() => {
    const list = listRef.current;
    if (!list || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Already on screen (e.g. restored scroll position): never hide what is visible.
    if (list.getBoundingClientRect().top < window.innerHeight * 0.92) return;

    setPhase("armed");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPhase("shown");
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" }
    );
    observer.observe(list);
    return () => observer.disconnect();
  }, []);

  if (collections.length === 0) return null;

  // On the 2-column phone grid an odd last tile spans both columns (as a wider
  // banner of the same height) so the grid never ends with a hole.
  const oddOnPhone = collections.length % 2 === 1;

  return (
    <ul ref={listRef} className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
      {collections.map((col, index) => {
        const cover = Array.isArray(col.images) ? col.images[0] : undefined;
        const spanWide = oddOnPhone && index === collections.length - 1;
        const reveal =
          phase === "static"
            ? ""
            : `transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none ${
                phase === "armed" ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
              }`;

        return (
          <li
            key={col.id}
            className={`${spanWide ? "col-span-2 md:col-span-1" : ""} ${reveal}`}
            style={phase === "shown" ? { transitionDelay: `${Math.min(index, 7) * 50}ms` } : undefined}
          >
            <Link
              href={`/collections/${col.slug}`}
              className={`group relative isolate flex w-full overflow-hidden rounded-xl border border-white/[0.08] bg-dark outline-none transition-colors duration-300 hover:border-brand/45 focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/50 motion-reduce:transition-none ${
                spanWide ? "aspect-[3/1] md:aspect-[4/3] lg:aspect-[16/10]" : "aspect-[3/2] md:aspect-[4/3] lg:aspect-[16/10]"
              }`}
            >
              <span className={`absolute inset-0 -z-20 ${categoryTextureClass(col.slug)}`} aria-hidden="true" />
              {cover && (
                <Image
                  src={cover}
                  alt=""
                  fill
                  sizes="(min-width: 1280px) 300px, (min-width: 768px) 25vw, 50vw"
                  className="-z-10 object-cover brightness-[0.62] contrast-[1.05] transition-[filter] duration-300 group-hover:brightness-[0.8] motion-reduce:transition-none"
                />
              )}
              {/* Bottom shade keeps the label legible on any image. */}
              <span className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/20 to-transparent" aria-hidden="true" />

              <span className="flex w-full flex-col justify-between p-3 sm:p-3.5">
                <span className="self-end text-[10px] font-medium tabular-nums tracking-[0.2em] text-white/40">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0">
                  <span className="mb-1.5 block h-px w-4 bg-brand transition-[width] duration-300 group-hover:w-6 motion-reduce:transition-none" aria-hidden="true" />
                  <span className="line-clamp-2 break-words text-[11px] font-semibold uppercase leading-tight tracking-[0.1em] text-white sm:text-xs sm:tracking-[0.16em]">
                    {col.name}
                  </span>
                  <span className="mt-0.5 block text-[10px] tracking-wide text-white/50">
                    {col.productCount > 0
                      ? `${col.productCount} skin${col.productCount > 1 ? "s" : ""}`
                      : "Coming soon"}
                  </span>
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
