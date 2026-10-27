"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Search } from "lucide-react";
import { useState } from "react";
import { groupPhoneModelsByBrand, phoneModelLooseKey, type PhoneModelOption } from "@/lib/phone-models";

interface FilterSidebarProps {
  collections: { id: string; name: string; slug: string }[];
  /** Active models from the phone_models table (same source as the product page and admin). */
  phoneModels: PhoneModelOption[];
}

export default function FilterSidebar({ collections, phoneModels }: FilterSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentCollection = searchParams.get("collection") || "";
  const requestedModel = searchParams.get("model") || "";
  // Old links may spell a model differently ("iPhone 16 Pro Max" vs "iphone 16 pro max").
  const currentModel = requestedModel
    ? phoneModels.find((m) => phoneModelLooseKey(m.name) === phoneModelLooseKey(requestedModel))?.name ?? requestedModel
    : "";
  const modelGroups = groupPhoneModelsByBrand(phoneModels);
  const modelIsListed = !currentModel || phoneModels.some((m) => m.name === currentModel);
  const currentSort = searchParams.get("sort") || "";
  const currentQ = searchParams.get("q") || "";
  const [collectionsOpen, setCollectionsOpen] = useState(false);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // Remove filter flags when changing other filters
    if (key !== "featured") params.delete("featured");
    if (key !== "bestseller") params.delete("bestseller");
    router.push(`/skins?${params.toString()}`);
    if (key === "collection") setCollectionsOpen(false);
  }

  return (
    <aside className="w-full lg:w-64 shrink-0 space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-muted" />
        <input
          type="text"
          placeholder="Search skins..."
          defaultValue={currentQ}
          onChange={(e) => {
            const t = setTimeout(() => updateParam("q", e.target.value), 400);
            return () => clearTimeout(t);
          }}
          className="w-full bg-dark-card border border-dark-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-dark-muted focus:outline-none focus:border-brand/50"
        />
      </div>

      {/* Sort */}
      <div>
        <label className="text-xs text-dark-muted uppercase tracking-wider font-medium block mb-2">Sort By</label>
        <select
          value={currentSort}
          onChange={(e) => updateParam("sort", e.target.value)}
          className="w-full bg-dark-card border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand/50 appearance-none"
        >
          <option value="">Recommended</option>
          <option value="newest">Newest</option>
          <option value="rating">Best rated</option>
          <option value="price-asc">Price: Low → High</option>
          <option value="price-desc">Price: High → Low</option>
        </select>
      </div>

      {/* Collection */}
      <div>
        <button
          type="button"
          aria-expanded={collectionsOpen}
          onClick={() => setCollectionsOpen((open) => !open)}
          className="flex min-h-11 w-full items-center justify-between rounded-xl border border-dark-border bg-dark-card px-3 text-left"
        >
          <span>
            <span className="block text-xs font-medium uppercase tracking-wider text-dark-muted">Collection</span>
            <span className="block pt-1 text-sm text-white">
              {collections.find((collection) => collection.slug === currentCollection)?.name || "All Collections"}
            </span>
          </span>
          <ChevronDown className={`h-4 w-4 text-brand transition-transform ${collectionsOpen ? "rotate-180" : ""}`} />
        </button>
        {collectionsOpen && (
          <div className="mt-2 max-h-64 space-y-1 overflow-y-auto rounded-xl border border-dark-border bg-dark-card p-2">
            <button
              onClick={() => updateParam("collection", "")}
              aria-current={!currentCollection ? "true" : undefined}
              className={`block min-h-11 w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${!currentCollection ? "bg-brand/10 text-brand" : "text-gray-400 hover:text-white"}`}
            >
              All Skins
            </button>
            {collections.map((col) => (
              <button
                key={col.id}
                onClick={() => updateParam("collection", col.slug)}
                aria-current={currentCollection === col.slug ? "true" : undefined}
                className={`block min-h-11 w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${currentCollection === col.slug ? "bg-brand/10 text-brand" : "text-gray-400 hover:text-white"}`}
              >
                {col.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Phone model */}
      <div>
        <label htmlFor="filter-phone-model" className="text-xs text-dark-muted uppercase tracking-wider font-medium block mb-2">Phone Model</label>
        <select
          id="filter-phone-model"
          value={currentModel}
          onChange={(e) => updateParam("model", e.target.value)}
          className="w-full bg-dark-card border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand/50 appearance-none"
        >
          <option value="">All Models</option>
          {!modelIsListed && <option value={currentModel}>{currentModel}</option>}
          {modelGroups.map(([brand, models]) => (
            <optgroup key={brand} label={brand}>
              {models.map((m) => (
                <option key={m.id} value={m.name}>{m.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
    </aside>
  );
}
