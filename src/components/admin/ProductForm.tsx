"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { slugify } from "@/lib/utils";
import { Plus, X, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { uploadFile } from "@/lib/upload-client";

interface Collection {
  id: string;
  name: string;
}

interface PhoneModel {
  id: string;
  brand: string;
  name: string;
  isActive: boolean;
}

interface ProductFormProps {
  product?: {
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
    collectionId: string | null;
    tags: string[];
    isBestSeller: boolean;
    isFeatured: boolean;
    isActive: boolean;
  };
}

export default function ProductForm({ product }: ProductFormProps) {
  const router = useRouter();
  const isEdit = !!product;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionsError, setCollectionsError] = useState("");
  const [phoneModels, setPhoneModels] = useState<PhoneModel[]>([]);
  const [phoneModelsLoading, setPhoneModelsLoading] = useState(true);
  const [phoneModelsError, setPhoneModelsError] = useState("");

  const [form, setForm] = useState({
    name: product?.name || "",
    slug: product?.slug || "",
    description: product?.description || "",
    price: product ? product.price / 1000 : 0,
    comparePrice: product?.comparePrice ? product.comparePrice / 1000 : 0,
    images: product?.images || [],
    compatibleModels: product?.compatibleModels || [],
    stock: product?.stock || 0,
    madeToOrder: product?.madeToOrder || false,
    collectionId: product?.collectionId || "",
    tags: product?.tags || [],
    isBestSeller: product?.isBestSeller || false,
    isFeatured: product?.isFeatured || false,
    isActive: product?.isActive ?? true,
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  const [uploadingImages, setUploadingImages] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function validateField(name: string, value: string | number): string {
    switch (name) {
      case "name":
        if (!value.toString().trim()) return "Product name is required";
        if (value.toString().trim().length < 2) return "Name must be at least 2 characters";
        return "";
      case "slug":
        if (!value.toString().trim()) return "Slug is required";
        if (!/^[a-z0-9-]+$/.test(value.toString())) return "Slug can only contain lowercase letters, numbers, and hyphens";
        return "";
      case "price":
        if (!value || Number(value) <= 0) return "Price is required";
        if (Number(value) > 10000) return "Price seems too high";
        return "";
      case "comparePrice":
        if (value && Number(value) <= 0) return "Compare price must be greater than 0";
        if (value && Number(value) <= Number(form.price)) return "Compare price must be higher than sale price";
        return "";
      case "stock":
        if (value === "" || Number(value) < 0) return "Stock is required";
        return "";
      case "collectionId":
        if (!value) return "Collection is required";
        return "";
      default:
        return "";
    }
  }

  function handleBlur(name: string, value: string | number) {
    setTouchedFields((prev) => ({ ...prev, [name]: true }));
    const error = validateField(name, value);
    setFieldErrors((prev) => ({ ...prev, [name]: error }));
  }

  function handleChange(name: string, value: string | number) {
    setForm((prev) => ({ ...prev, [name]: value }));
    if (touchedFields[name]) {
      const error = validateField(name, value);
      setFieldErrors((prev) => ({ ...prev, [name]: error }));
    }
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {};
    let isValid = true;

    (["name", "slug", "price", "comparePrice", "stock", "collectionId"] as const).forEach((key) => {
      const error = validateField(key, form[key]);
      if (error) {
        errors[key] = error;
        isValid = false;
      }
    });

    if (form.images.length === 0) {
      errors.images = "At least one image is required";
      isValid = false;
    }

    if (form.compatibleModels.length === 0) {
      errors.compatibleModels = "At least one phone model is required";
      isValid = false;
    }

    setFieldErrors(errors);
    setTouchedFields(
      ["name", "slug", "price", "comparePrice", "stock", "collectionId", "images", "compatibleModels"].reduce(
        (acc, key) => ({ ...acc, [key]: true }),
        {}
      )
    );
    return isValid;
  }

useEffect(() => {
    let mounted = true;
    fetch("/api/admin/collections")
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Failed to load collections");
        if (!Array.isArray(payload.data)) throw new Error("Invalid collections response");
        if (mounted) setCollections(payload.data);
      })
      .catch((loadError: unknown) => {
        if (!mounted) return;
        setCollectionsError("Unable to load collections. Please refresh and try again.");
        if (process.env.NODE_ENV === "development") console.error("Load product collections error:", loadError);
      });
    return () => { mounted = false; };
  }, []);

  const phoneModelsLoadedRef = useRef(false);

  useEffect(() => {
    if (phoneModelsLoadedRef.current) return;
    phoneModelsLoadedRef.current = true;

    let mounted = true;
    setPhoneModelsLoading(true);
    setPhoneModelsError("");

    fetch("/api/admin/phone-models")
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Failed to load phone models");
        if (!Array.isArray(payload.data)) throw new Error("Invalid phone models response");
        if (mounted) {
          setPhoneModels(payload.data);
          setPhoneModelsLoading(false);
        }
      })
      .catch((loadError: unknown) => {
        if (mounted) {
          setPhoneModelsError("Unable to load phone models. Please refresh and try again.");
          setPhoneModelsLoading(false);
          if (process.env.NODE_ENV === "development") console.error("Load product phone models error:", loadError);
        }
      });

    return () => { mounted = false; };
  }, []);

  function handleNameChange(name: string) {
    setForm((prev) => ({
      ...prev,
      name,
      slug: isEdit ? prev.slug : slugify(name),
    }));
    if (touchedFields.name) {
      const error = validateField("name", name);
      setFieldErrors((prev) => ({ ...prev, name: error }));
    }
  }

  // Group phone models by brand
  const groupedModels = phoneModels.reduce<Record<string, PhoneModel[]>>((acc, model) => {
    if (!acc[model.brand]) {
      acc[model.brand] = [];
    }
    acc[model.brand].push(model);
    return acc;
  }, {});

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadingImages(true);
    setFieldErrors((prev) => ({ ...prev, images: "" }));

    const newImages: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        newImages.push(await uploadFile("/api/admin/upload", file));
      }

      if (newImages.length > 0) {
        setForm((prev) => ({ ...prev, images: [...prev.images, ...newImages] }));
      }
    } catch (uploadError: unknown) {
      const errorMessage = uploadError instanceof Error ? uploadError.message : "Failed to upload images";
      setFieldErrors((prev) => ({ ...prev, images: errorMessage }));
    } finally {
      setUploadingImages(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function removeImage(index: number) {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  }

  function moveImage(index: number, direction: "up" | "down") {
    const newImages = [...form.images];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newImages.length) return;
    [newImages[index], newImages[targetIndex]] = [
      newImages[targetIndex],
      newImages[index],
    ];
    setForm((prev) => ({ ...prev, images: newImages }));
  }

  function toggleModel(model: string) {
    setForm((prev) => ({
      ...prev,
      compatibleModels: prev.compatibleModels.includes(model)
        ? prev.compatibleModels.filter((m) => m !== model)
        : [...prev.compatibleModels, model],
    }));
  }

  function selectAllModels() {
    setForm((prev) => ({ ...prev, compatibleModels: phoneModels.map((m) => m.name) }));
  }

  function clearAllModels() {
    setForm((prev) => ({ ...prev, compatibleModels: [] }));
  }

  function addTag() {
    if (!tagInput.trim()) return;
    if (form.tags.includes(tagInput.trim())) return;
    setForm((prev) => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
    setTagInput("");
  }

  function removeTag(tag: string) {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError("");

    const payload = {
      ...form,
      price: Math.round(form.price * 1000),
      comparePrice: form.comparePrice ? Math.round(form.comparePrice * 1000) : null,
      collectionId: form.collectionId || null,
    };

    try {
      const url = isEdit
        ? `/api/admin/products/${product.id}`
        : "/api/admin/products";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const details = process.env.NODE_ENV === "development" && data?.details
          ? ` (${data.details})`
          : "";
        setError(`${data?.error || `Request failed (${res.status})`}${details}`);
        setLoading(false);
        return;
      }

      router.push("/admin/products");
    } catch (submitError: unknown) {
      if (process.env.NODE_ENV === "development") console.error("Submit product error:", submitError);
      setError("Unable to save the product because the server could not be reached. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div>
      <Link href="/admin/products" className="inline-flex items-center gap-1.5 text-sm text-dark-muted hover:text-white transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to Products
      </Link>

      <h1 className="text-2xl font-bold text-white mb-6">
        {isEdit ? "Edit Product" : "New Product"}
      </h1>

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        {/* Basic Info */}
        <div className="bg-dark-card rounded-2xl p-6 border border-dark-border space-y-4">
          <h2 className="text-lg font-semibold text-white">Basic Information</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-dark-muted block mb-1.5">Product Name *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                onBlur={(e) => handleBlur("name", e.target.value)}
                className={`w-full bg-dark rounded-xl px-4 py-3 text-sm text-white placeholder:text-dark-muted focus:outline-none transition-colors ${
                  touchedFields.name && fieldErrors.name
                    ? "border-red-500 focus:border-red-500"
                    : "border-dark-border focus:border-brand/50"
                }`}
                aria-invalid={touchedFields.name && !!fieldErrors.name}
                aria-describedby={touchedFields.name && fieldErrors.name ? "name-error" : undefined}
              />
              {touchedFields.name && fieldErrors.name && (
                <p id="name-error" className="text-red-400 text-xs mt-1.5" role="alert">
                  {fieldErrors.name}
                </p>
              )}
            </div>
            <div>
              <label className="text-xs text-dark-muted block mb-1.5">Slug *</label>
              <input
                type="text"
                required
                value={form.slug}
                onChange={(e) => handleChange("slug", e.target.value)}
                onBlur={(e) => handleBlur("slug", e.target.value)}
                className={`w-full bg-dark rounded-xl px-4 py-3 text-sm text-white placeholder:text-dark-muted focus:outline-none transition-colors ${
                  touchedFields.slug && fieldErrors.slug
                    ? "border-red-500 focus:border-red-500"
                    : "border-dark-border focus:border-brand/50"
                }`}
                aria-invalid={touchedFields.slug && !!fieldErrors.slug}
                aria-describedby={touchedFields.slug && fieldErrors.slug ? "slug-error" : undefined}
              />
              {touchedFields.slug && fieldErrors.slug && (
                <p id="slug-error" className="text-red-400 text-xs mt-1.5" role="alert">
                  {fieldErrors.slug}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs text-dark-muted block mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              rows={4}
              className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-sm text-white placeholder:text-dark-muted focus:outline-none focus:border-brand/50 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-dark-muted block mb-1.5">Price (DT) *</label>
              <input
                type="number"
                step="0.1"
                required
                value={form.price}
                onChange={(e) => handleChange("price", parseFloat(e.target.value) || 0)}
                onBlur={(e) => handleBlur("price", parseFloat(e.target.value) || 0)}
                className={`w-full bg-dark rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-colors ${
                  touchedFields.price && fieldErrors.price
                    ? "border-red-500 focus:border-red-500"
                    : "border-dark-border focus:border-brand/50"
                }`}
                aria-invalid={touchedFields.price && !!fieldErrors.price}
                aria-describedby={touchedFields.price && fieldErrors.price ? "price-error" : undefined}
              />
              {touchedFields.price && fieldErrors.price && (
                <p id="price-error" className="text-red-400 text-xs mt-1.5" role="alert">
                  {fieldErrors.price}
                </p>
              )}
            </div>
            <div>
              <label className="text-xs text-dark-muted block mb-1.5">Compare Price (DT)</label>
              <input
                type="number"
                step="0.1"
                value={form.comparePrice}
                onChange={(e) => handleChange("comparePrice", parseFloat(e.target.value) || 0)}
                onBlur={(e) => handleBlur("comparePrice", parseFloat(e.target.value) || 0)}
                className={`w-full bg-dark rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-colors ${
                  touchedFields.comparePrice && fieldErrors.comparePrice
                    ? "border-red-500 focus:border-red-500"
                    : "border-dark-border focus:border-brand/50"
                }`}
                aria-invalid={touchedFields.comparePrice && !!fieldErrors.comparePrice}
                aria-describedby={touchedFields.comparePrice && fieldErrors.comparePrice ? "comparePrice-error" : undefined}
              />
              {touchedFields.comparePrice && fieldErrors.comparePrice && (
                <p id="comparePrice-error" className="text-red-400 text-xs mt-1.5" role="alert">
                  {fieldErrors.comparePrice}
                </p>
              )}
            </div>
            <div>
              <label className="text-xs text-dark-muted block mb-1.5">Stock *</label>
              <input
                type="number"
                required
                value={form.stock}
                onChange={(e) => handleChange("stock", parseInt(e.target.value) || 0)}
                onBlur={(e) => handleBlur("stock", parseInt(e.target.value) || 0)}
                className={`w-full bg-dark rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-colors ${
                  touchedFields.stock && fieldErrors.stock
                    ? "border-red-500 focus:border-red-500"
                    : "border-dark-border focus:border-brand/50"
                }`}
                aria-invalid={touchedFields.stock && !!fieldErrors.stock}
                aria-describedby={touchedFields.stock && fieldErrors.stock ? "stock-error" : undefined}
              />
              {touchedFields.stock && fieldErrors.stock && (
                <p id="stock-error" className="text-red-400 text-xs mt-1.5" role="alert">
                  {fieldErrors.stock}
                </p>
              )}
            </div>
          </div>

          <label className="mt-4 flex min-h-11 items-center gap-3 text-sm text-white">
            <input type="checkbox" checked={form.madeToOrder} onChange={(e) => setForm((prev) => ({ ...prev, madeToOrder: e.target.checked }))} className="h-5 w-5 accent-brand" />
            Made to order (inventory is not reserved or deducted)
          </label>

          <div>
            <label className="text-xs text-dark-muted block mb-1.5">Collection *</label>
            <select
              value={form.collectionId}
              onChange={(e) => handleChange("collectionId", e.target.value)}
              onBlur={(e) => handleBlur("collectionId", e.target.value)}
              className={`w-full bg-dark rounded-xl px-4 py-3 text-sm text-white focus:outline-none appearance-none transition-colors ${
                touchedFields.collectionId && fieldErrors.collectionId
                  ? "border-red-500 focus:border-red-500"
                  : "border-dark-border focus:border-brand/50"
              }`}
              aria-invalid={touchedFields.collectionId && !!fieldErrors.collectionId}
              aria-describedby={touchedFields.collectionId && fieldErrors.collectionId ? "collectionId-error" : undefined}
            >
              <option value="">Select Collection</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {collectionsError && <p className="text-red-400 text-xs mt-1.5" role="alert">{collectionsError}</p>}
            {touchedFields.collectionId && fieldErrors.collectionId && (
              <p id="collectionId-error" className="text-red-400 text-xs mt-1.5" role="alert">
                {fieldErrors.collectionId}
              </p>
            )}
          </div>
        </div>

        {/* Images */}
        <div className="bg-dark-card rounded-2xl p-6 border border-dark-border space-y-4">
          <h2 className="text-lg font-semibold text-white">Images</h2>
          <p className="text-xs text-dark-muted">Upload images from your computer. Drag order by reordering thumbnails (use up/down arrows or remove).</p>

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,video/mp4,video/webm"
              multiple
              onChange={handleImageUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImages}
              className="flex items-center gap-2 bg-brand/10 hover:bg-brand/20 text-brand px-4 py-2.5 rounded-xl transition-colors text-sm font-medium disabled:opacity-50"
            >
              {uploadingImages && <Loader2 className="w-4 h-4 animate-spin" />}
              {uploadingImages ? "Uploading..." : "Upload Images"}
            </button>
            <span className="text-xs text-dark-muted">
              JPG, PNG, WEBP, GIF, SVG, MP4, WebM • Max 50MB each
            </span>
          </div>

          {touchedFields.images && fieldErrors.images && (
            <p className="text-red-400 text-xs" role="alert">
              {fieldErrors.images}
            </p>
          )}

          {form.images.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {form.images.map((img, i) => (
                <div key={i} className="relative group">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-dark border border-dark-border relative">
                    <Image src={img} alt={`Product image ${i + 1}`} fill className="object-cover" sizes="(max-width: 640px) 96px, 112px" />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="touch-visible-action absolute -top-1.5 -right-1.5 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    aria-label={`Remove image ${i + 1}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <div className="touch-visible-action absolute bottom-1 left-1 right-1 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => moveImage(i, "up")}
                      disabled={i === 0}
                      className="bg-black/60 hover:bg-black/80 text-white px-1.5 py-0.5 rounded text-[10px] disabled:opacity-30"
                      aria-label="Move image up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveImage(i, "down")}
                      disabled={i === form.images.length - 1}
                      className="bg-black/60 hover:bg-black/80 text-white px-1.5 py-0.5 rounded text-[10px] disabled:opacity-30"
                      aria-label="Move image down"
                    >
                      ↓
                    </button>
                  </div>
                  <p className="text-[9px] text-dark-muted mt-1 truncate max-w-[112px]">{img}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Phone Models */}
        <div className="bg-dark-card rounded-2xl p-6 border border-dark-border space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Compatible Phone Models</h2>
            <div className="flex gap-2">
              <button type="button" onClick={selectAllModels} className="text-[10px] text-brand hover:text-brand-dark">Select All</button>
              <button type="button" onClick={clearAllModels} className="text-[10px] text-dark-muted hover:text-white">Clear</button>
            </div>
          </div>

          {phoneModelsLoading ? (
            <div className="flex items-center gap-2 text-sm text-dark-muted py-3">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading phone models...
            </div>
          ) : phoneModelsError ? (
            <div className="text-sm text-red-400 py-3" role="alert">{phoneModelsError}</div>
          ) : phoneModels.length === 0 ? (
            <div className="text-center py-8 bg-dark border border-dark-border rounded-xl text-dark-muted">
              No phone models found. <a href="/admin/phone-models" className="text-brand hover:underline ml-2">Add some first</a>.
            </div>
          ) : (
            Object.entries(groupedModels).map(([brandName, brandModels]) => (
              <div key={brandName}>
                <p className="text-xs text-dark-muted mb-2">{brandName}</p>
                <div className="flex flex-wrap gap-2">
                  {brandModels.map((model) => (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => toggleModel(model.name)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                        form.compatibleModels.includes(model.name)
                          ? "bg-brand text-black border-brand font-medium"
                          : "border-dark-border text-gray-400 hover:border-dark-muted"
                      }`}
                    >
                      {model.name}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Tags */}
        <div className="bg-dark-card rounded-2xl p-6 border border-dark-border space-y-4">
          <h2 className="text-lg font-semibold text-white">Tags</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Add a tag"
              className="flex-1 bg-dark border border-dark-border rounded-xl px-4 py-3 text-sm text-white placeholder:text-dark-muted focus:outline-none focus:border-brand/50"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
            />
            <button type="button" onClick={addTag} className="bg-brand/10 hover:bg-brand/20 text-brand px-4 py-3 rounded-xl transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {form.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {form.tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1.5 text-xs bg-white/5 text-gray-300 px-3 py-1.5 rounded-lg">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="text-dark-muted hover:text-red-400">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Flags */}
        <div className="bg-dark-card rounded-2xl p-6 border border-dark-border space-y-4">
          <h2 className="text-lg font-semibold text-white">Visibility</h2>
          <div className="space-y-3">
            {[
              { key: "isActive" as const, label: "Active", desc: "Product is visible on the store" },
              { key: "isFeatured" as const, label: "Featured", desc: "Show in featured section" },
              { key: "isBestSeller" as const, label: "Best Seller", desc: "Show best seller badge" },
            ].map(({ key, label, desc }) => (
              <label key={key} className="flex items-center justify-between cursor-pointer py-2">
                <div>
                  <p className="text-sm text-white">{label}</p>
                  <p className="text-xs text-dark-muted">{desc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, [key]: !prev[key] }))}
                  className={`w-11 h-6 rounded-full transition-colors ${form[key] ? "bg-brand" : "bg-dark-border"}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ml-1 ${form[key] ? "translate-x-5" : ""}`} />
                </button>
              </label>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-400" role="alert" aria-live="polite">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-brand hover:bg-brand-dark text-black font-bold px-8 py-3 rounded-xl text-sm transition-all disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? "Update Product" : "Create Product"}
          </button>
          <Link href="/admin/products" className="bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-xl text-sm transition-colors">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
