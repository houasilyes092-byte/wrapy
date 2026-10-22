"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, ChevronLeft, ChevronRight } from "lucide-react";
import { slugify } from "@/lib/utils";
import ImageUpload from "@/components/admin/ImageUpload";
import { ResponsiveTable } from "@/components/admin/ResponsiveTable";
import Image from "next/image";

interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  images: string[];
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

export default function AdminCollections() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Collection | null>(null);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    images: [] as string[],
    isActive: true,
  });
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
    fetch(`/api/admin/collections?page=${page}&limit=20`)
      .then((res) => res.json())
      .then((json) => {
        if (!mounted) return;
        setCollections(json.data || []);
        setPagination(json.pagination || { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false });
      })
      .catch((err) => {
        if (mounted) console.error("Failed to load collections:", err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [pagination.page]);

  function openNew() {
    setEditing(null);
    setForm({ name: "", slug: "", description: "", images: [], isActive: true });
    setShowForm(true);
  }

  function openEdit(col: Collection) {
    setEditing(col);
    setForm({
      name: col.name,
      slug: col.slug,
      description: col.description || "",
      images: col.images || [],
      isActive: col.isActive,
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const method = editing ? "PUT" : "POST";
    const body = editing ? { id: editing.id, ...form } : form;

    await fetch("/api/admin/collections", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setShowForm(false);
    // Re-fetch collections for current page
    fetch(`/api/admin/collections?page=${pagination.page}&limit=20`)
      .then((res) => res.json())
      .then((json) => {
        setCollections(json.data || []);
        setPagination(json.pagination || { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false });
      });
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this collection?")) return;
    const res = await fetch(`/api/admin/collections?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      // Keep the row: removing it locally would make it "reappear" on refresh.
      const body = await res.json().catch(() => null);
      alert(body?.error || "Could not delete this collection.");
      return;
    }
    setCollections((prev) => prev.filter((c) => c.id !== id));
  }

  const columns = [
    {
      key: "collection",
      header: "Collection",
      render: (col: Collection) => <span className="text-sm text-white">{col.name}</span>,
    },
    {
      key: "slug",
      header: "Slug",
      render: (col: Collection) => <span className="text-sm text-dark-muted">{col.slug}</span>,
    },
    {
      key: "images",
      header: "Images",
      render: (col: Collection) => (
        <div className="flex gap-1.5">
          {(col.images || []).slice(0, 3).map((img, i) => (
            <div key={i} className="w-10 h-10 rounded-lg overflow-hidden bg-dark border border-dark-border flex-shrink-0 relative">
              <Image src={img} alt="" fill className="object-cover" sizes="40px" />
            </div>
          ))}
          {(col.images || []).length > 3 && (
            <div className="w-10 h-10 rounded-lg bg-dark-border flex items-center justify-center text-xs text-dark-muted flex-shrink-0">
              +{(col.images || []).length - 3}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (col: Collection) => (
        <span className={`text-[11px] font-medium px-2 py-1 rounded-full ${col.isActive ? "bg-green-400/10 text-green-400" : "bg-red-400/10 text-red-400"}`}>
          {col.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right" as const,
      className: "w-24",
      render: (col: Collection) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => openEdit(col)} className="text-dark-muted hover:text-white transition-colors p-2"><Pencil className="w-4 h-4" /></button>
          <button onClick={() => handleDelete(col.id)} className="text-dark-muted hover:text-red-400 transition-colors p-2"><Trash2 className="w-4 h-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Collections</h1>
        <button onClick={openNew} className="flex items-center gap-2 bg-brand hover:bg-brand-dark text-black font-semibold px-4 py-2.5 rounded-xl text-sm transition-all">
          <Plus className="w-4 h-4" />
          New Collection
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowForm(false)} />
          <div className="relative bg-dark-card rounded-2xl border border-dark-border p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">{editing ? "Edit" : "New"} Collection</h2>
              <button onClick={() => setShowForm(false)} className="text-dark-muted hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-dark-muted block mb-1">Name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value, slug: editing ? form.slug : slugify(e.target.value) })}
                  className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand/50"
                />
              </div>
              <div>
                <label className="text-xs text-dark-muted block mb-1">Slug</label>
                <input
                  required
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand/50"
                />
              </div>
              <div>
                <label className="text-xs text-dark-muted block mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand/50 resize-none"
                />
              </div>
              <div>
                <ImageUpload
                  value={form.images[0] || ""}
                  onChange={(url) => setForm({ ...form, images: url ? [url] : [] })}
                  label="Collection Cover Image"
                  multiple={false}
                  maxFiles={1}
                />
              </div>
              <div>
                <label className="text-xs text-dark-muted block mb-1">Additional Images (Gallery)</label>
                <ImageUpload
                  value=""
                  onChange={(url) => {
                    if (url) {
                      setForm({ ...form, images: [...form.images, url] });
                    }
                  }}
                  label=""
                  multiple={true}
                  maxFiles={10}
                />
              </div>
              <button type="submit" className="w-full bg-brand hover:bg-brand-dark text-black font-bold py-3 rounded-xl text-sm transition-all">
                {editing ? "Update" : "Create"}
              </button>
            </form>
          </div>
        </div>
      )}

      <ResponsiveTable
        items={collections}
        columns={columns}
        keyExtractor={(col) => col.id}
        emptyMessage="No collections yet"
        loading={loading}
        cardKeyFields={["slug", "images", "status", "actions"]}
      />

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 px-1">
          <p className="text-sm text-dark-muted">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} collections
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
