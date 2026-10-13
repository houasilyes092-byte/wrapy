"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, ChevronLeft, ChevronRight } from "lucide-react";
import { ResponsiveTable } from "@/components/admin/ResponsiveTable";

interface Coupon {
  id: string;
  code: string;
  type: string;
  value: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
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

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState({ code: "", type: "percentage" as string, value: 0, maxUses: 0, expiresAt: "", isActive: true });
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
    fetch(`/api/admin/coupons?page=${page}&limit=20`)
      .then((res) => res.json())
      .then((json) => {
        if (!mounted) return;
        setCoupons(json.data || []);
        setPagination(json.pagination || { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false });
      })
      .catch((err) => {
        if (mounted) console.error("Failed to load coupons:", err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [pagination.page]);

  function openNew() {
    setEditing(null);
    setForm({ code: "", type: "percentage", value: 0, maxUses: 0, expiresAt: "", isActive: true });
    setShowForm(true);
  }

  function openEdit(c: Coupon) {
    setEditing(c);
    setForm({
      code: c.code,
      type: c.type,
      value: c.type === "fixed" ? c.value / 1000 : c.value,
      maxUses: c.maxUses || 0,
      expiresAt: c.expiresAt ? c.expiresAt.split("T")[0] : "",
      isActive: c.isActive,
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const method = editing ? "PUT" : "POST";
    const value = form.type === "fixed" ? form.value * 1000 : form.value;
    const body = editing
      ? { id: editing.id, ...form, value, maxUses: form.maxUses || null, expiresAt: form.expiresAt || null }
      : { ...form, value, maxUses: form.maxUses || null, expiresAt: form.expiresAt || null };

    await fetch("/api/admin/coupons", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setShowForm(false);
    // Re-fetch coupons for current page
    fetch(`/api/admin/coupons?page=${pagination.page}&limit=20`)
      .then((res) => res.json())
      .then((json) => {
        setCoupons(json.data || []);
        setPagination(json.pagination || { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false });
      });
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this coupon?")) return;
    await fetch(`/api/admin/coupons?id=${id}`, { method: "DELETE" });
    setCoupons((prev) => prev.filter((c) => c.id !== id));
  }

  const columns = [
    {
      key: "code",
      header: "Code",
      render: (c: Coupon) => <span className="text-sm text-white font-mono">{c.code}</span>,
    },
    {
      key: "type",
      header: "Type",
      render: (c: Coupon) => <span className="text-sm text-dark-muted capitalize">{c.type}</span>,
    },
    {
      key: "value",
      header: "Value",
      render: (c: Coupon) => <span className="text-sm text-white">{c.type === "percentage" ? `${c.value}%` : `${(c.value / 1000).toFixed(1)} DT`}</span>,
    },
    {
      key: "usage",
      header: "Usage",
      render: (c: Coupon) => <span className="text-sm text-dark-muted">{c.usedCount}/{c.maxUses || "∞"}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (c: Coupon) => (
        <span className={`text-[11px] font-medium px-2 py-1 rounded-full ${c.isActive ? "bg-green-400/10 text-green-400" : "bg-red-400/10 text-red-400"}`}>
          {c.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right" as const,
      className: "w-24",
      render: (c: Coupon) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => openEdit(c)} className="text-dark-muted hover:text-white transition-colors p-2"><Pencil className="w-4 h-4" /></button>
          <button onClick={() => handleDelete(c.id)} className="text-dark-muted hover:text-red-400 transition-colors p-2"><Trash2 className="w-4 h-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Coupons</h1>
        <button onClick={openNew} className="flex items-center gap-2 bg-brand hover:bg-brand-dark text-black font-semibold px-4 py-2.5 rounded-xl text-sm transition-all">
          <Plus className="w-4 h-4" />
          New Coupon
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowForm(false)} />
          <div className="relative bg-dark-card rounded-2xl border border-dark-border p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">{editing ? "Edit" : "New"} Coupon</h2>
              <button onClick={() => setShowForm(false)} className="text-dark-muted hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-dark-muted block mb-1">Code</label>
                <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand/50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-dark-muted block mb-1">Type</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand/50 appearance-none">
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed (DT)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-dark-muted block mb-1">Value</label>
                  <input type="number" step="0.1" required value={form.value} onChange={(e) => setForm({ ...form, value: parseFloat(e.target.value) || 0 })} className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand/50" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-dark-muted block mb-1">Max Uses (0=unlimited)</label>
                  <input type="number" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: parseInt(e.target.value) || 0 })} className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand/50" />
                </div>
                <div>
                  <label className="text-xs text-dark-muted block mb-1">Expires At</label>
                  <input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand/50" />
                </div>
              </div>
              <button type="submit" className="w-full bg-brand hover:bg-brand-dark text-black font-bold py-3 rounded-xl text-sm transition-all">
                {editing ? "Update" : "Create"}
              </button>
            </form>
          </div>
        </div>
      )}

      <ResponsiveTable
        items={coupons}
        columns={columns}
        keyExtractor={(c) => c.id}
        emptyMessage="No coupons yet"
        loading={loading}
        cardKeyFields={["type", "value", "usage", "status", "actions"]}
      />

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 px-1">
          <p className="text-sm text-dark-muted">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} coupons
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
