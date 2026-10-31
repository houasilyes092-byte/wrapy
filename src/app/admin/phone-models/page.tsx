"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Loader2, ChevronLeft, ChevronRight, Pencil, Check, X } from "lucide-react";
import { ResponsiveTable } from "@/components/admin/ResponsiveTable";
import { sortPhoneModels } from "@/lib/phone-models";

interface PhoneModel {
  id: string;
  brand: string;
  name: string;
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

const DEFAULT_BRANDS = ["iPhone", "Samsung", "Xiaomi", "Google", "OnePlus", "Other"];

export default function PhoneModelsPage() {
  const [models, setModels] = useState<PhoneModel[]>([]);
  const [brand, setBrand] = useState("iPhone");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 100,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  // Row editing: one row at a time.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editBrand, setEditBrand] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchModels() {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/phone-models?page=${page}&limit=100`, { cache: "no-store" });
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || "Failed to load models");
        }
        if (cancelled) return;

        setModels(json.data || []);
        setPagination(json.pagination || { page: 1, limit: 100, total: 0, totalPages: 0, hasNext: false, hasPrev: false });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load models");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchModels();
    return () => {
      cancelled = true;
    };
  }, [page]);

  // Brands offered when adding or editing: the usual ones plus any already in use.
  const brandOptions = [...new Set([...DEFAULT_BRANDS, ...models.map((model) => model.brand)])];

  async function addModel(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) return;

    try {
      setSaving(true);
      setError("");

      const res = await fetch("/api/admin/phone-models", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          brand,
          name: name.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to add model");
        return;
      }

      setModels((current) => [...current, data]);
      setPagination((current) => ({ ...current, total: current.total + 1 }));
      setName("");
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(model: PhoneModel) {
    setError("");
    setEditingId(model.id);
    setEditName(model.name);
    setEditBrand(model.brand);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditBrand("");
  }

  async function patchModel(id: string, changes: { name?: string; brand?: string; isActive?: boolean }) {
    try {
      setBusyId(id);
      setError("");

      const res = await fetch(`/api/admin/phone-models/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || "Failed to update model");
        return false;
      }

      setModels((current) => current.map((model) => (model.id === id ? { ...model, ...data } : model)));
      return true;
    } catch {
      setError("Network error");
      return false;
    } finally {
      setBusyId(null);
    }
  }

  async function saveEdit(model: PhoneModel) {
    const nextName = editName.trim();
    const nextBrand = editBrand.trim();
    if (!nextName || !nextBrand) {
      setError("Brand and name are required");
      return;
    }

    const changes: { name?: string; brand?: string } = {};
    if (nextName !== model.name) changes.name = nextName;
    if (nextBrand !== model.brand) changes.brand = nextBrand;
    if (Object.keys(changes).length === 0) {
      cancelEdit();
      return;
    }

    if (await patchModel(model.id, changes)) cancelEdit();
  }

  async function toggleActive(model: PhoneModel) {
    await patchModel(model.id, { isActive: !model.isActive });
  }

  async function deleteModel(model: PhoneModel) {
    if (
      !confirm(
        `Delete "${model.name}"? Customers will no longer be able to choose it. Existing orders keep the model name.`
      )
    ) {
      return;
    }

    try {
      setBusyId(model.id);
      setError("");

      const res = await fetch(`/api/admin/phone-models/${model.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to delete model");
        return;
      }

      if (editingId === model.id) cancelEdit();
      setModels((current) => current.filter((item) => item.id !== model.id));
      setPagination((current) => ({ ...current, total: Math.max(0, current.total - 1) }));
    } catch {
      setError("Network error");
    } finally {
      setBusyId(null);
    }
  }

  const columns = [
    {
      key: "name",
      header: "Model",
      render: (model: PhoneModel) =>
        editingId === model.id ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={editBrand}
              onChange={(e) => setEditBrand(e.target.value)}
              aria-label="Brand"
              className="bg-dark border border-dark-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand/50"
            >
              {[...new Set([...brandOptions, editBrand])].map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  saveEdit(model);
                } else if (e.key === "Escape") {
                  cancelEdit();
                }
              }}
              aria-label="Model name"
              autoFocus
              className="min-w-0 flex-1 bg-dark border border-dark-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand/50"
            />
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium text-white">{model.name}</p>
            <p className="text-xs text-dark-muted">{model.brand}</p>
          </div>
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (model: PhoneModel) => (
        <button
          type="button"
          onClick={() => toggleActive(model)}
          disabled={busyId === model.id}
          title={model.isActive ? "Deactivate: customers can no longer choose it" : "Activate: customers can choose it"}
          aria-pressed={model.isActive}
          className={`text-[11px] font-medium px-2 py-1 rounded-full transition-colors disabled:opacity-50 ${
            model.isActive
              ? "bg-green-400/10 text-green-400 hover:bg-green-400/20"
              : "bg-red-400/10 text-red-400 hover:bg-red-400/20"
          }`}
        >
          {model.isActive ? "Active" : "Inactive"}
        </button>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right" as const,
      className: "w-32",
      render: (model: PhoneModel) => (
        <div className="flex items-center justify-end gap-1">
          {editingId === model.id ? (
            <>
              <button
                type="button"
                onClick={() => saveEdit(model)}
                disabled={busyId === model.id}
                className="p-2 text-green-400 hover:bg-green-500/10 rounded-lg transition-colors disabled:opacity-50"
                title="Save"
                aria-label="Save"
              >
                {busyId === model.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="p-2 text-dark-muted hover:bg-white/5 rounded-lg transition-colors"
                title="Cancel"
                aria-label="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => startEdit(model)}
              disabled={busyId === model.id}
              className="p-2 text-dark-muted hover:text-white hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50"
              title="Edit"
              aria-label="Edit"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => deleteModel(model)}
            disabled={busyId === model.id}
            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
            title="Delete"
            aria-label="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Phone Models
        </h1>
        <p className="text-sm text-dark-muted mt-1">
          Customers can only order for the active models below. Every skin is available for all of them.
        </p>
      </div>

      <form
        onSubmit={addModel}
        className="bg-dark-card border border-dark-border rounded-2xl p-6"
      >
        <h2 className="text-lg font-semibold text-white mb-4">
          Add Phone Model
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <select
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="bg-dark border border-dark-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand/50"
          >
            {brandOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>

          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Example: iPhone 17 Pro Max"
            className="bg-dark border border-dark-border rounded-xl px-4 py-3 text-sm text-white placeholder:text-dark-muted focus:outline-none focus:border-brand/50"
          />

          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark text-black font-semibold rounded-xl px-4 py-3 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}

            Add Model
          </button>
        </div>
      </form>

      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      <ResponsiveTable
        items={sortPhoneModels(models)}
        columns={columns}
        keyExtractor={(m) => m.id}
        emptyMessage="No phone models yet."
        loading={loading}
        cardKeyFields={["status", "actions"]}
      />

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 px-1">
          <p className="text-sm text-dark-muted">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} models
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((current) => Math.max(1, current - 1))}
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
              onClick={() => setPage((current) => current + 1)}
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
