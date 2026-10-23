"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
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
 * Homepage categories: one lead card plus an even grid.
 * Phone/tablet: 2 columns, lead card full width. Desktop (lg): 4-column bento,
 * lead card 2×2. Motion is opacity/transform only, plays once on first reveal,
 * and is skipped entirely for reduced motion or if the grid is already on screen.
 */
export function CategoriesGrid({ collections }: { collections: CategoryCard[] }) {
  const listRef = useRef<HTMLUListElement>(null);
  const [phase, setPhase] = useState<Phase>("static");

  useEffect(() => {
    const list = listRef.current;
    if (!list || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Already visible (e.g. restored scroll position): never hide what the visitor sees.
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

  const rest = collections.length - 1;
  // With an odd number of small cards, the last one spans both columns below lg
  // so the 2-column layout never ends with a gap.
  const lastSpansWide = rest % 2 === 1;

  return (
    <ul ref={listRef} className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {collections.map((col, index) => {
        const lead = index === 0;
        const wide = lead || (lastSpansWide && index === collections.length - 1);
        const cover = Array.isArray(col.images) ? col.images[0] : undefined;
        const reveal =
          phase === "static"
            ? ""
            : `transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                phase === "armed" ? "opacity-0 translate-y-5" : "opacity-100 translate-y-0"
              }`;

        return (
          <li
            key={col.id}
            className={`${wide ? "col-span-2" : ""} ${lead ? "lg:row-span-2" : "lg:col-span-1"} ${reveal}`}
            style={phase === "shown" ? { transitionDelay: `${index * 70}ms` } : undefined}
          >
            <Link
              href={`/collections/${col.slug}`}
              className={`group relative isolate flex h-full w-full overflow-hidden rounded-2xl border border-white/[0.07] outline-none transition-[border-color,transform] duration-300 ease-out hover:border-brand/40 focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/60 active:scale-[0.985] motion-reduce:transform-none motion-reduce:transition-none ${
                lead
                  ? "aspect-[16/11] sm:aspect-[2/1] lg:aspect-auto lg:min-h-full"
                  : wide
                    ? "aspect-[2/1] lg:aspect-[4/5]"
                    : "aspect-[4/5] sm:aspect-[4/3] lg:aspect-[4/5]"
              }`}
            >
              {/* Category identity: always painted, so loading or missing images never leave a hole. */}
              <span className={`absolute inset-0 -z-20 ${categoryTextureClass(col.slug)}`} aria-hidden="true" />
              {cover && (
                <Image
                  src={cover}
                  alt=""
                  fill
                  sizes={lead ? "(min-width: 1024px) 640px, 100vw" : wide ? "(min-width: 1024px) 320px, 100vw" : "(min-width: 1024px) 320px, 50vw"}
                  className="-z-10 object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06] motion-reduce:transition-none"
                />
              )}
              <span
                className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/25 to-black/0"
                aria-hidden="true"
              />

              <span className="flex w-full flex-col justify-between p-4 sm:p-5 lg:p-6">
                <span className="text-[11px] font-medium tabular-nums tracking-[0.22em] text-white/50">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="flex items-end justify-between gap-3">
                  <span className="min-w-0">
                    <span
                      className={`block font-semibold tracking-tight text-white ${
                        lead ? "text-2xl sm:text-3xl lg:text-4xl" : "text-base sm:text-lg"
                      }`}
                    >
                      {col.name}
                    </span>
                    {lead && col.description && (
                      <span className="mt-1.5 hidden max-w-sm text-sm text-white/65 sm:line-clamp-2">
                        {col.description}
                      </span>
                    )}
                    <span className="mt-1 block text-xs text-white/55">
                      {col.productCount > 0
                        ? `${col.productCount} skin${col.productCount > 1 ? "s" : ""}`
                        : "Bientôt disponible"}
                    </span>
                  </span>
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 text-white transition-colors duration-300 group-hover:border-brand group-hover:bg-brand group-hover:text-black group-focus-visible:border-brand"
                    aria-hidden="true"
                  >
                    <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none" />
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
