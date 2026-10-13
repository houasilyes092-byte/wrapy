"use client";

import { useEffect, useState } from "react";
import { Check, Trash2, X as XIcon, ChevronLeft, ChevronRight, Filter, Star, Loader2, Home } from "lucide-react";
import { ResponsiveTable } from "@/components/admin/ResponsiveTable";

interface Review {
  id: string;
  productId: string;
  productName?: string;
  customerName: string | null;
  title: string | null;
  rating: number;
  comment: string | null;
  isApproved: boolean;
  isHomepage: boolean;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface Stats {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  homepage: number;
  averageRating: number;
}

export default function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ total: 0, approved: 0, pending: 0, rejected: 0, homepage: 0, averageRating: 0 });
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [filters, setFilters] = useState({
    status: "",
    rating: "",
    search: "",
  });

  useEffect(() => {
    let mounted = true;
    const page = pagination.page;

    const params = new URLSearchParams({
      page: String(page),
      limit: String(pagination.limit),
    });
    if (filters.status) params.set("status", filters.status);
    if (filters.rating) params.set("rating", filters.rating);
    if (filters.search) params.set("search", filters.search);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch(`/api/admin/reviews?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (!mounted) return;
        setReviews(json.data || []);
        setPagination(json.pagination || { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false });
        setStats(json.stats || { total: 0, approved: 0, pending: 0, rejected: 0, averageRating: 0 });
      })
      .catch((err) => {
        if (mounted) console.error("Failed to fetch reviews:", err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [pagination.page, pagination.limit, filters.status, filters.rating, filters.search]);

  async function toggleApproval(id: string, isApproved: boolean) {
    await fetch("/api/admin/reviews", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isApproved }),
    });
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, isApproved } : r)));
  }

  async function toggleHomepage(id: string, isHomepage: boolean) {
    await fetch("/api/admin/reviews", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isHomepage }),
    });
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, isHomepage } : r)));
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this review?")) return;
    await fetch(`/api/admin/reviews?id=${id}`, { method: "DELETE" });
    setReviews((prev) => prev.filter((r) => r.id !== id));
  }

  const columns = [
    {
      key: "customer",
      header: "Customer",
      render: (r: Review) => <span className="text-sm text-white">{r.customerName || "Anonymous"}</span>,
    },
    {
      key: "product",
      header: "Product",
      render: (r: Review) => <span className="text-sm text-dark-muted max-w-xs truncate">{r.productName || r.productId}</span>,
    },
    {
      key: "rating",
      header: "Rating",
      render: (r: Review) => (
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className={`text-sm ${i < r.rating ? "text-brand" : "text-dark-border"}`}>★</span>
          ))}
        </div>
      ),
    },
    {
      key: "title",
      header: "Title",
      render: (r: Review) => <span className="text-sm text-dark-muted max-w-xs truncate">{r.title || "—"}</span>,
    },
    {
      key: "comment",
      header: "Comment",
      render: (r: Review) => <span className="text-sm text-dark-muted max-w-xs truncate">{r.comment || "—"}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (r: Review) => (
        <span className={`text-[11px] font-medium px-2 py-1 rounded-full ${r.isApproved ? "bg-green-400/10 text-green-400" : "bg-yellow-400/10 text-yellow-400"}`}>
          {r.isApproved ? "Approved" : "Pending"}
        </span>
      ),
    },
    {
      key: "homepage",
      header: "Homepage",
      render: (r: Review) => (
        <button
          onClick={() => toggleHomepage(r.id, !r.isHomepage)}
          className={`text-sm transition-colors p-1 rounded ${r.isHomepage ? "text-brand" : "text-dark-muted hover:text-brand"}`}
          title={r.isHomepage ? "Remove from homepage" : "Show on homepage"}
        >
          <Home className="w-5 h-5" fill={r.isHomepage ? "currentColor" : "none"} strokeWidth={r.isHomepage ? 0 : 2} />
        </button>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right" as const,
      className: "w-28",
      render: (r: Review) => (
        <div className="flex items-center justify-end gap-1">
          {r.isApproved ? (
            <button onClick={() => toggleApproval(r.id, false)} className="text-dark-muted hover:text-yellow-400 transition-colors p-2" title="Unapprove">
              <XIcon className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={() => toggleApproval(r.id, true)} className="text-dark-muted hover:text-green-400 transition-colors p-2" title="Approve">
              <Check className="w-4 h-4" />
            </button>
          )}
          <button onClick={() => handleDelete(r.id)} className="text-dark-muted hover:text-red-400 transition-colors p-2"><Trash2 className="w-4 h-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-white">Reviews</h1>
        <div className="flex items-center gap-4">
          <div className="grid grid-cols-5 gap-3 bg-dark-card border border-dark-border rounded-xl p-4 min-w-[450px]">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{stats.total}</div>
              <div className="text-xs text-dark-muted">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{stats.approved}</div>
              <div className="text-xs text-dark-muted">Approved</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
              <div className="text-xs text-dark-muted">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-brand">{stats.homepage}</div>
              <div className="text-xs text-dark-muted">On Homepage</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-brand">{stats.averageRating > 0 ? stats.averageRating.toFixed(1) : "—"}</div>
              <div className="text-xs text-dark-muted">Avg Rating</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-muted" />
          <input
            type="text"
            placeholder="Search reviews..."
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value, page: 1 }))}
            className="w-full bg-dark-card border border-dark-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-dark-muted focus:outline-none focus:border-brand/50"
          />
        </div>
        <select
          value={filters.status}
          onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))}
          className="min-w-[160px] bg-dark-card border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand/50 appearance-none"
        >
          <option value="">All Status</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
        </select>
        <select
          value={filters.rating}
          onChange={(e) => setFilters((prev) => ({ ...prev, rating: e.target.value, page: 1 }))}
          className="min-w-[140px] bg-dark-card border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand/50 appearance-none"
        >
          <option value="">All Ratings</option>
          <option value="5">5 Stars</option>
          <option value="4">4 Stars</option>
          <option value="3">3 Stars</option>
          <option value="2">2 Stars</option>
          <option value="1">1 Star</option>
        </select>
      </div>

      <ResponsiveTable
        items={reviews}
        columns={columns}
        keyExtractor={(r) => r.id}
        emptyMessage="No reviews yet"
        loading={loading}
        cardKeyFields={["product", "rating", "title", "comment", "status", "actions"]}
      />

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 px-1">
          <p className="text-sm text-dark-muted">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} reviews
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