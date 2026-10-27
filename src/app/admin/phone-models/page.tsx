"use client";

import { useEffect, useState, useRef } from "react";
import { Plus, Trash2, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
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

export default function PhoneModelsPage() {
  const [models, setModels] = useState<PhoneModel[]>([]);
  const [brand, setBrand] = useState("iPhone");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const loadedRef = useRef(false);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  async function fetchModels(page = 1) {
    try {
      const res = await fetch(`/api/admin/phone-models?page=${page}&limit=100`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to load models");
      }

      setModels(json.data || []);
      setPagination(json.pagination || { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load models");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    fetchModels(pagination.page);
  }, [pagination.page]);

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

  async function deleteModel(id: string) {
    if (!confirm("Delete this phone model?")) return;

    try {
      const res = await fetch(`/api/admin/phone-models/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to delete model");
        return;
      }

      setModels((current) => current.filter((model) => model.id !== id));
    } catch {
      setError("Network error");
    }
  }

  const columns = [
    {
      key: "name",
      header: "Model",
      render: (model: PhoneModel) => (
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
        <span className={`text-[11px] font-medium px-2 py-1 rounded-full ${model.isActive ? "bg-green-400/10 text-green-400" : "bg-red-400/10 text-red-400"}`}>
          {model.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right" as const,
      className: "w-24",
      render: (model: PhoneModel) => (
        <button
          type="button"
          onClick={() => deleteModel(model.id)}
          className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
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
          Manage the phone models available for your skins.
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
            <option value="iPhone">iPhone</option>
            <option value="Samsung">Samsung</option>
            <option value="Xiaomi">Xiaomi</option>
            <option value="Google">Google</option>
            <option value="OnePlus">OnePlus</option>
            <option value="Other">Other</option>
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

        {error && (
          <p className="text-sm text-red-400 mt-4">
            {error}
          </p>
        )}
      </form>

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