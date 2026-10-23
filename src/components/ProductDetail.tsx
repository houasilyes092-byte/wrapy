"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useCart } from "@/context/cart";
import { useWishlist } from "@/context/wishlist";
import { formatPrice } from "@/lib/utils";
import Image from "next/image";
import {
  ShoppingBag,
  Check,
  Minus,
  Plus,
  ChevronLeft,
  Loader2,
  Smartphone,
  X,
  ChevronDown,
  Trash2,
  Heart,
} from "lucide-react";
import Link from "next/link";
import ProductCard from "./ProductCard";

interface PhoneModel {
  id: string;
  brand: string;
  name: string;
  isActive: boolean;
}

interface SelectedPhoneModel {
  modelName: string;
  quantity: number;
}

interface Props {
  product: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    price: number;
    comparePrice: number | null;
    images: string[];
    compatibleModels: string[];
    stock: number;
    madeToOrder: boolean;
    tags: string[];
    isBestSeller: boolean;
    isFeatured: boolean;
  };

  collectionName: string | null;

  relatedProducts: {
    id: string;
    name: string;
    slug: string;
    price: number;
    comparePrice: number | null;
    images: string[];
    isBestSeller: boolean;
    isFeatured: boolean;
  }[];
}

export default function ProductDetail({
  product,
  collectionName,
  relatedProducts,
}: Props) {
  const { addItem } = useCart();
  const { isInWishlist, toggleItem, loading: wishlistLoading } = useWishlist();
  const inWishlist = isInWishlist(product.id);
  const [wishlistToggling, setWishlistToggling] = useState(false);

  const handleWishlistToggle = async () => {
    if (wishlistToggling || wishlistLoading) return;
    setWishlistToggling(true);
    try {
      await toggleItem({
        productId: product.id,
        productName: product.name,
        productImage: product.images[0] || "",
        price: product.price,
        slug: product.slug,
      });
    } catch (error) {
      console.error("Wishlist toggle failed:", error);
    } finally {
      setWishlistToggling(false);
    }
  };

  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedModels, setSelectedModels] = useState<SelectedPhoneModel[]>([]);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState("");

  const [phoneModels, setPhoneModels] = useState<PhoneModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [customModel, setCustomModel] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [hasInteracted, setHasInteracted] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  /*
   * Load active phone models from the public storefront endpoint.
   */
  useEffect(() => {
    async function loadPhoneModels() {
      try {
        setLoadingModels(true);

        const response = await fetch("/api/phone-models", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to load phone models");
        }

        const data: PhoneModel[] = await response.json();

        setPhoneModels(data);
      } catch (err) {
        console.error("Phone models loading error:", err);
        setPhoneModels([]);
      } finally {
        setLoadingModels(false);
      }
    }

    loadPhoneModels();
  }, []);

  const discount =
    product.comparePrice && product.comparePrice > product.price
      ? Math.round(
          ((product.comparePrice - product.price) / product.comparePrice) * 100
        )
      : null;

  const inStock = product.madeToOrder || product.stock > 0;

  /*
   * If the product has compatibleModels configured,
   * show only those models.
   *
   * If compatibleModels is empty,
   * show all active models from the database.
   */
  const availableModels = useMemo(() => {
    if (product.compatibleModels.length === 0) {
      return phoneModels;
    }

    const compatible = new Set(product.compatibleModels);

    return phoneModels.filter((model) => compatible.has(model.name));
  }, [phoneModels, product.compatibleModels]);

  /*
   * Group models dynamically by brand.
   *
   * Example:
   * iPhone
   * Samsung
   * Xiaomi
   * Google
   * OnePlus
   */
  const groupedModels = useMemo(() => {
    return availableModels.reduce<Record<string, PhoneModel[]>>(
      (groups, model) => {
        if (!groups[model.brand]) {
          groups[model.brand] = [];
        }

        groups[model.brand].push(model);

        return groups;
      },
      {}
    );
  }, [availableModels]);

  // Filter models based on input value
  const filteredModels = useMemo(() => {
    if (!customModel.trim()) {
      return groupedModels;
    }
    const query = customModel.toLowerCase().trim();
    const filtered: Record<string, PhoneModel[]> = {};
    Object.entries(groupedModels).forEach(([brand, models]) => {
      const matched = models.filter(
        (m) =>
          m.name.toLowerCase().includes(query) ||
          `${brand} ${m.name}`.toLowerCase().includes(query)
      );
      if (matched.length > 0) {
        filtered[brand] = matched;
      }
    });
    return filtered;
  }, [customModel, groupedModels]);

  // Flatten filtered models for keyboard navigation
  const flattenedModels = useMemo(() => {
    const flat: PhoneModel[] = [];
    Object.values(filteredModels).forEach((models) => {
      flat.push(...models);
    });
    return flat;
  }, [filteredModels]);

  const isModelCompatible = (model: string): boolean => {
    if (product.compatibleModels.length === 0) {
      return true; // If no restrictions, all models are compatible
    }
    return product.compatibleModels.includes(model);
  };

  const isModelAlreadySelected = (modelName: string): boolean => {
    return selectedModels.some((m) => m.modelName === modelName);
  };

  const handleModelSelect = useCallback((modelName: string) => {
    if (isModelAlreadySelected(modelName)) {
      return; // Already selected, ignore
    }
    setSelectedModels((prev) => [...prev, { modelName, quantity: 1 }]);
    setCustomModel("");
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    setError("");
    setHasInteracted(true);
    inputRef.current?.blur();
  }, [selectedModels]);

  const handleCustomModelChange = useCallback((value: string) => {
    setCustomModel(value);
    setShowSuggestions(value.length > 0);
    setHighlightedIndex(-1);
    setError("");
    if (hasInteracted && value.length > 0) {
      setShowSuggestions(true);
    }
  }, [hasInteracted]);

  const handleInputFocus = useCallback(() => {
    if (customModel.length > 0 || !hasInteracted) {
      setShowSuggestions(true);
    }
    setHasInteracted(true);
  }, [customModel, hasInteracted]);

  const handleInputBlur = useCallback(() => {
    // Delay to allow click on suggestion
    setTimeout(() => setShowSuggestions(false), 200);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showSuggestions || flattenedModels.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < flattenedModels.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : flattenedModels.length - 1
          );
          break;
        case "Enter":
          if (highlightedIndex >= 0) {
            e.preventDefault();
            handleModelSelect(flattenedModels[highlightedIndex].name);
          }
          break;
        case "Escape":
          e.preventDefault();
          setShowSuggestions(false);
          setHighlightedIndex(-1);
          inputRef.current?.blur();
          break;
        case "Tab":
          // Allow tab to close dropdown naturally
          if (highlightedIndex >= 0) {
            handleModelSelect(flattenedModels[highlightedIndex].name);
          }
          break;
      }
    },
    [showSuggestions, flattenedModels, highlightedIndex, handleModelSelect]
  );

  const removeModel = useCallback((modelName: string) => {
    setSelectedModels((prev) => prev.filter((m) => m.modelName !== modelName));
    setError("");
  }, []);

  const updateModelQuantity = useCallback((modelName: string, quantity: number) => {
    if (quantity <= 0) {
      removeModel(modelName);
      return;
    }
    setSelectedModels((prev) =>
      prev.map((m) => (m.modelName === modelName ? { ...m, quantity } : m))
    );
  }, [removeModel]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleAddToCart() {
    if (loadingModels) {
      return;
    }

    // Validate model selection
    if (selectedModels.length === 0) {
      setError("Please select at least one phone model");
      return;
    }

    // Check compatibility for all selected models
    for (const selected of selectedModels) {
      if (!isModelCompatible(selected.modelName.trim())) {
        setError(
          `The selected skin may not be compatible with "${selected.modelName.trim()}". Please check compatibility or contact support.`
        );
        return;
      }
    }

    if (!inStock) {
      return;
    }

    // Add each selected model as a separate cart item
    selectedModels.forEach((selected) => {
      addItem({
        productId: product.id,
        productName: product.name,
        productImage: product.images[0] || "",
        phoneModel: selected.modelName.trim(),
        price: product.price,
        quantity: selected.quantity,
        slug: product.slug,
      });
    });

    setAdded(true);
    setError("");

    // Clear selection after adding to cart
    setTimeout(() => {
      setAdded(false);
      setSelectedModels([]);
    }, 2000);
  }

  const mainImage =
    product.images[selectedImage] ||
    product.images[0] ||
    "/placeholder.svg";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <Link
        href="/skins"
        className="inline-flex items-center gap-1.5 text-sm text-dark-muted hover:text-white transition-colors mb-8"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Skins
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
        {/* Gallery */}
        <div className="space-y-4">
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-dark-card border border-dark-border">
            <Image
              src={mainImage}
              alt={product.name}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>

          {product.images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2 snap-x">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedImage(i)}
                  className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 snap-center ${
                    selectedImage === i
                      ? "border-brand"
                      : "border-dark-border hover:border-dark-muted"
                  }`}
                >
                  <Image
                    src={img}
                    alt={`${product.name} ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          {collectionName && (
            <p className="text-xs text-brand font-medium tracking-wider uppercase">
              {collectionName}
            </p>
          )}

          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
{product.name}
          </h1>

{/* Price */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-white">
                {formatPrice(product.price)}
              </span>

              {product.comparePrice &&
                product.comparePrice > product.price && (
                  <>
                    <span className="text-lg text-dark-muted line-through">
                      {formatPrice(product.comparePrice)}
                    </span>

                    {discount !== null && (
                      <span className="bg-red-500/20 text-red-400 text-xs font-bold px-2 py-0.5 rounded-full">
                        -{discount}%
                      </span>
                    )}
                  </>
                )}
            </div>

            {/* Wishlist Button */}
            <button
              onClick={handleWishlistToggle}
              disabled={wishlistToggling || wishlistLoading}
              className={`p-2.5 rounded-xl transition-all min-w-[44px] min-h-[44px] flex items-center justify-center ${
                inWishlist
                  ? "bg-brand/10 text-brand hover:bg-brand/20"
                  : "bg-white/5 text-gray-400 hover:text-brand hover:bg-brand/10"
              } ${wishlistToggling || wishlistLoading ? "opacity-50 cursor-wait" : ""}`}
              aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
              aria-pressed={inWishlist}
            >
              {wishlistToggling ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Heart className={`w-5 h-5 ${inWishlist ? "fill-current" : ""}`} />
              )}
            </button>
          </div>

          {/* Stock */}
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
              inStock ? "bg-brand" : "bg-red-500"
              }`}
            />

            <span className="text-sm text-gray-400">
              {product.madeToOrder
                ? "Made to order"
                : inStock
                ? `In stock (${product.stock})`
                : "Out of stock"}
            </span>
          </div>

          {/* Description */}
          {product.description && (
            <p className="text-sm text-gray-400 leading-relaxed">
              {product.description}
            </p>
          )}

          {/* Tags */}
          {product.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[11px] text-dark-muted bg-white/5 px-2.5 py-1 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

{/* Phone Model Selection */}
          <div>
            <label className="text-sm font-medium text-white mb-3 block">
              Select Phone Models{" "}
              <span className="text-red-400">*</span>
            </label>

            {loadingModels ? (
              <div className="flex items-center gap-2 text-sm text-dark-muted py-3">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading phone models...
              </div>
            ) : (
              <div className="space-y-3">
                {/* Selected Models List */}
                {selectedModels.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-brand font-medium">
                      Selected Models ({selectedModels.length})
                    </p>
                    {selectedModels.map((selected, index) => (
                      <div
                        key={selected.modelName}
                        className="flex items-center gap-3 p-4 bg-dark-card border border-dark-border rounded-xl"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Smartphone className="w-5 h-5 text-brand flex-shrink-0" />
                          <span className="text-sm font-medium text-white truncate">
                            {selected.modelName}
                          </span>
                          {!isModelCompatible(selected.modelName) && (
                            <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full flex-shrink-0">
                              May not be compatible
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-dark-muted">Qty:</span>
                          <div className="inline-flex items-center bg-dark border border-dark-border rounded-lg">
                            <button
                              type="button"
                              onClick={() =>
                                updateModelQuantity(
                                  selected.modelName,
                                  selected.quantity - 1
                                )
                              }
                              className="px-3.5 py-2.5 text-gray-400 hover:text-white hover:bg-white/5 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="px-4 py-2.5 text-sm text-white font-medium min-w-[40px] text-center">
                              {selected.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                updateModelQuantity(
                                  selected.modelName,
                                  selected.quantity + 1
                                )
                              }
                              disabled={!product.madeToOrder && selected.quantity >= product.stock}
                              className="px-3.5 py-2.5 text-gray-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40 min-w-[44px] min-h-[44px] flex items-center justify-center"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeModel(selected.modelName)}
                            className="text-gray-400 hover:text-red-400 transition-colors p-3 min-w-[44px] min-h-[44px] flex items-center justify-center"
                            aria-label={`Remove ${selected.modelName}`}
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Custom input with suggestions */}
                <div className="relative" ref={dropdownRef}>
                  <div className="relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={customModel}
                      onChange={(e) => handleCustomModelChange(e.target.value)}
                      onFocus={handleInputFocus}
                      onBlur={handleInputBlur}
                      onKeyDown={handleKeyDown}
                      placeholder="Type or select a phone model to add (e.g., iPhone 15 Pro)"
                      className={`w-full px-4 py-3.5 pr-12 rounded-xl border bg-dark-card transition-all text-base ${
                        error
                          ? "border-red-500 focus:border-red-500"
                          : "border-dark-border focus:border-brand"
                      } text-white placeholder-gray-500`}
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      {showSuggestions && flattenedModels.length > 0 ? (
                        <Loader2 className="w-5 h-5 animate-spin text-brand" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-dark-muted" />
                      )}
                    </div>
                  </div>

                  {showSuggestions && (
                    <div
                      className={`absolute top-full left-0 right-0 mt-1 z-20 ${
                        window.innerWidth < 640 ? "left-0 right-0" : ""
                      }`}
                      role="listbox"
                      aria-label="Phone model suggestions"
                    >
                      <div className="bg-dark-card border border-dark-border rounded-xl overflow-hidden shadow-lg max-h-[60vh]">
                        {flattenedModels.length === 0 && customModel.trim() ? (
                          <div className="px-4 py-6 text-center">
                            <p className="text-sm text-dark-muted">
                              No models match &apos;{customModel}&apos;
                            </p>
                            <p className="text-xs text-dark-muted/50 mt-1">
                              Try a different search or enter your model manually
                            </p>
                          </div>
                        ) : (
                          <>
                            {Object.entries(filteredModels).map(([brand, models]) => (
                              <div key={brand} className="max-h-60 overflow-y-auto">
                                <p className="px-3 py-2 text-xs text-dark-muted border-b border-dark-border bg-white/5 sticky top-0">
                                  {brand}
                                </p>
                                <div className="p-1" role="group" aria-label={brand}>
                                  {models.map((model) => {
                                    const flatIndex = flattenedModels.findIndex(
                                      (m) => m.id === model.id
                                    );
                                    const isHighlighted = flatIndex === highlightedIndex;
                                    const isAlreadySelected = isModelAlreadySelected(model.name);
                                    const isCompatible = isModelCompatible(model.name);
                                    return (
                                      <button
                                        key={model.id}
                                        type="button"
                                        role="option"
                                        aria-selected={isAlreadySelected}
                                        aria-disabled={!isCompatible || isAlreadySelected}
                                        onClick={() => handleModelSelect(model.name)}
                                        onMouseEnter={() => setHighlightedIndex(flatIndex)}
                                        className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-all ${
                                          isAlreadySelected
                                            ? "bg-brand/20 text-brand font-semibold cursor-default"
                                            : isHighlighted
                                            ? "bg-white/10 text-white"
                                            : !isCompatible
                                            ? "text-gray-500 cursor-not-allowed"
                                            : "text-gray-400 hover:bg-white/5 hover:text-white"
                                        }`}
                                        disabled={!isCompatible || isAlreadySelected}
                                      >
                                        <div className="flex items-center justify-between">
                                          <span>{model.name}</span>
                                          {!isCompatible && (
                                            <span className="text-[10px] text-red-400 ml-2">
                                              Incompatible
                                            </span>
                                          )}
                                          {isAlreadySelected && (
                                            <span className="text-[10px] text-brand ml-2">
                                              Added
                                            </span>
                                          )}
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {error && (
                  <p className="text-red-400 text-xs mt-2">{error}</p>
                )}
              </div>
            )}
          </div>

          {/* Total Price for Selected Models */}
          {selectedModels.length > 0 && (
            <div className="bg-brand/10 border border-brand/20 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white">Total for selected models:</span>
                <span className="text-lg font-bold text-brand">
                  {formatPrice(
                    selectedModels.reduce(
                      (sum, m) => sum + product.price * m.quantity,
                      0
                    )
                  )}
                </span>
              </div>
              <p className="text-xs text-dark-muted mt-1">
                {selectedModels.length} model{selectedModels.length !== 1 ? "s" : ""},{" "}
                {selectedModels.reduce((sum, m) => sum + m.quantity, 0)} item{selectedModels.reduce((sum, m) => sum + m.quantity, 0) !== 1 ? "s" : ""}
              </p>
            </div>
          )}

          {/* Add to Cart */}
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={
              !inStock ||
              added ||
              loadingModels ||
              availableModels.length === 0 ||
              selectedModels.length === 0
            }
            className={`w-full flex items-center justify-center gap-3 font-bold py-4.5 px-8 rounded-xl text-sm uppercase tracking-wider transition-all duration-200 min-h-[52px] ${
              added
                ? "bg-green-500 text-white"
                : inStock &&
                    !loadingModels &&
                    availableModels.length > 0 &&
                    selectedModels.length > 0
                ? "bg-brand hover:bg-brand-dark text-black"
                : "bg-gray-800 text-gray-500 cursor-not-allowed"
            }`}
          >
            {added ? (
              <>
                <Check className="w-5 h-5" />
                Added to Cart
              </>
            ) : loadingModels ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <ShoppingBag className="w-5 h-5" />
                Add to Cart —{" "}
                {formatPrice(
                  selectedModels.reduce(
                    (sum, m) => sum + product.price * m.quantity,
                    0
                  )
                )}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="mt-20">
          <h2 className="text-2xl font-bold text-white mb-8">
            You May Also Like
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
