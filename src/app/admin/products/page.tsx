"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { ResponsiveTable } from "@/components/admin/ResponsiveTable";

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string[];
  stock: number;
  collectionName: string | null;
  isBestSeller: boolean;
  isFeatured: boolean;
  isActive: boolean;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteError, setDeleteError] = useState("");
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  useEffect(() => {
    let mounted = true;
    const page = pagination.page;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch(`/api/admin/products?page=${page}&limit=20`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch products");
        return res.json();
      })
      .then((json) => {
        if (!mounted) return;
        setProducts(json.data || []);
        setPagination(json.pagination || { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false });
      })
      .catch((err) => {
        if (mounted) console.error("Failed to fetch products:", err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [pagination.page]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this product?")) return;
    setDeleteError("");
    try {
      const response = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.error || "Unable to delete product. Please try again.");
      }

      setProducts((prev) => prev.filter((product) => product.id !== id));
      setPagination((prev) => {
        const total = Math.max(0, prev.total - 1);
        const totalPages = Math.ceil(total / prev.limit);
        const page = Math.min(prev.page, Math.max(1, totalPages));
        return {
          ...prev,
          page,
          total,
          totalPages,
          hasPrev: page > 1,
          hasNext: page < totalPages,
        };
      });
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Unable to delete product. Please try again.");
    }
  }

  const columns = [
    // ... same columns as before
    {
      key: "product",
      header: "Product",
      render: (p: Product) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-dark shrink-0 relative">
            {p.images[0] && (
              <Image
                src={p.images[0]}
                alt=""
                fill
                className="object-cover"
                sizes="40px"
              />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{p.name}</p>
            <div className="flex gap-1 mt-0.5">
              {p.isBestSeller && <span className="text-[9px] bg-brand/20 text-brand px-1.5 py-0.5 rounded">Best</span>}
              {p.isFeatured && <span className="text-[9px] bg-blue-400/20 text-blue-400 px-1.5 py-0.5 rounded">Featured</span>}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "price",
      header: "Price",
      align: "left" as const,
      render: (p: Product) => <span className="text-sm text-white">{formatPrice(p.price)}</span>,
    },
    {
      key: "collection",
      header: "Collection",
      align: "left" as const,
      render: (p: Product) => <span className="text-sm text-dark-muted">{p.collectionName || "—"}</span>,
    },
    {
      key: "stock",
      header: "Stock",
      align: "left" as const,
      render: (p: Product) => <span className={`text-sm ${p.stock < 10 ? "text-red-400" : "text-white"}`}>{p.stock}</span>,
    },
    {
      key: "status",
      header: "Status",
      align: "left" as const,
      render: (p: Product) => (
        <span className={`text-[11px] font-medium px-2 py-1 rounded-full ${p.isActive ? "bg-green-400/10 text-green-400" : "bg-red-400/10 text-red-400"}`}>
          {p.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right" as const,
      className: "w-32",
      render: (p: Product) => (
        <div className="flex items-center justify-end gap-1">
          <Link href={`/admin/products/${p.id}/edit`} className="text-dark-muted hover:text-white transition-colors p-2">
            <Pencil className="w-4 h-4" />
          </Link>
          <button onClick={() => handleDelete(p.id)} className="text-dark-muted hover:text-red-400 transition-colors p-2">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Products</h1>
        <Link
          href="/admin/products/new"
          className="flex items-center gap-2 bg-brand hover:bg-brand-dark text-black font-semibold px-4 py-2.5 rounded-xl text-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          New Product
        </Link>
      </div>

      {deleteError && <p role="alert" className="mb-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-400">{deleteError}</p>}

      <ResponsiveTable
        items={products}
        columns={columns}
        keyExtractor={(p) => p.id}
        emptyMessage="No products yet"
        loading={loading}
        cardKeyFields={["collection", "stock", "status", "actions"]}
      />

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 px-1">
          <p className="text-sm text-dark-muted">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} products
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
              disabled={!pagination.hasPrev}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-sm text-white">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
              disabled={!pagination.hasNext}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
