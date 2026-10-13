"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown, ChevronUp } from "lucide-react";

type Collection = {
  id: string;
  name: string;
  slug: string;
  images: string[] | null;
};

export function CategoriesGrid({ collections }: { collections: Collection[] }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? collections : collections.slice(0, 6);
  const hasMore = collections.length > 6;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
        {visible.map((col) => (
          <Link
            key={col.id}
            href={`/collections/${col.slug}`}
            className="group flex flex-col items-center gap-2 rounded-lg border border-dark-border bg-dark p-2 sm:p-3 transition-all duration-150 hover:border-brand/40"
          >
            <div className="relative aspect-square w-full overflow-hidden rounded-md bg-dark-card">
              {col.images && Array.isArray(col.images) && col.images.length > 0 ? (
                <Image
                  src={col.images[0]}
                  alt={col.name}
                  fill
                  className="object-cover transition-transform duration-150 group-hover:scale-[1.05]"
                  sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, 16vw"
                />
              ) : null}
            </div>
            <span className="text-xs font-medium text-white group-hover:text-brand transition-colors line-clamp-1 text-center">
              {col.name}
            </span>
          </Link>
        ))}
      </div>
      {hasMore && (
        <div className="flex justify-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-dark-border bg-dark px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:border-brand/40 hover:text-brand"
            aria-expanded={showAll}
          >
            {showAll ? "Voir moins" : "Toutes les catégories"}
            {showAll ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      )}
    </div>
  );
}