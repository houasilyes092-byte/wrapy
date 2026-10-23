"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, X, Eye, EyeOff } from "lucide-react";
import { FAQ_CATEGORIES } from "@/lib/faq-categories";

interface FaqRow {
  id: string;
  category: string;
  question: string;
  answer: string;
  sortOrder: number;
  isPublished: boolean;
}

type FormState = Omit<FaqRow, "id">;

const emptyForm: FormState = {
  category: FAQ_CATEGORIES[0],
  question: "",
  answer: "",
  sortOrder: 0,
  isPublished: false,
};

const inputClass =
  "w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand/50";

export default function AdminFaq() {
  const [rows, setRows] = useState<FaqRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [editing, setEditing] = useState<FaqRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/faq", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      setRows(json.data || []);
      setLoadError("");
    } catch {
      setLoadError("Could not load the questions. Refresh the page.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const groups = useMemo(() => {
    const order = [...FAQ_CATEGORIES, ...new Set(rows.map((r) => r.category))].filter(
      (value, index, all) => all.indexOf(value) === index
    );
    return order
      .map((category) => ({ category, items: rows.filter((r) => r.category === category).sort((a, b) => a.sortOrder - b.sortOrder) }))
      .filter((group) => group.items.length > 0);
  }, [rows]);

  function openNew() {
    const next = rows.filter((r) => r.category === emptyForm.category).reduce((max, r) => Math.max(max, r.sortOrder), 0) + 1;
    setEditing(null);
    setForm({ ...emptyForm, sortOrder: next });
    setFormError("");
    setShowForm(true);
  }

  function openEdit(row: FaqRow) {
    setEditing(row);
    setForm({ category: row.category, question: row.question, answer: row.answer, sortOrder: row.sortOrder, isPublished: row.isPublished });
    setFormError("");
    setShowForm(true);
  }

  async function save(payload: Partial<FaqRow> & FormState, id?: string) {
    const res = await fetch("/api/admin/faq", {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(id ? { id, ...payload } : payload),
    }).catch(() => null);
    if (!res || !res.ok) {
      const data = await res?.json().catch(() => null);
      throw new Error(data?.error || "Could not save. Please try again.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      await save(form, editing?.id);
      setShowForm(false);
      await load();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(row: FaqRow) {
    try {
      await save({ ...row, isPublished: !row.isPublished }, row.id);
      await load();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Could not update.");
    }
  }

  async function handleDelete(row: FaqRow) {
    if (!confirm(`Delete "${row.question}"?`)) return;
    const res = await fetch(`/api/admin/faq?id=${row.id}`, { method: "DELETE" }).catch(() => null);
    if (!res || !res.ok) {
      const data = await res?.json().catch(() => null);
      alert(data?.error || "Could not delete.");
      return;
    }
    await load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-white">FAQ</h1>
        <button onClick={openNew} className="flex items-center gap-2 bg-brand hover:bg-brand-dark text-black font-semibold px-4 py-2.5 rounded-xl text-sm transition-all">
          <Plus className="w-4 h-4" />
          New question
        </button>
      </div>
      <p className="text-sm text-dark-muted mb-6">
        Only published questions appear on /faq and the homepage. Drafts starting with &quot;To confirm&quot; are waiting for a confirmed policy.
      </p>

      {loadError && <p role="alert" className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3">{loadError}</p>}

      {loading ? (
        <p className="text-sm text-dark-muted">Loading…</p>
      ) : groups.length === 0 && !loadError ? (
        <div className="rounded-2xl border border-dark-border bg-dark-card p-8 text-center text-sm text-dark-muted">
          No questions yet.
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.category} className="rounded-2xl border border-dark-border bg-dark-card">
              <h2 className="px-5 py-3 border-b border-dark-border text-sm font-semibold text-white">{group.category}</h2>
              <ul className="divide-y divide-dark-border">
                {group.items.map((row) => (
                  <li key={row.id} className="flex items-start gap-3 px-5 py-4">
                    <span className="w-8 shrink-0 text-xs text-dark-muted tabular-nums pt-0.5">{row.sortOrder}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white">{row.question}</p>
                      <p className="mt-1 text-xs text-dark-muted line-clamp-2">{row.answer}</p>
                    </div>
                    <span className={`shrink-0 text-[11px] font-medium px-2 py-1 rounded-full ${row.isPublished ? "bg-green-400/10 text-green-400" : "bg-white/5 text-dark-muted"}`}>
                      {row.isPublished ? "Published" : "Draft"}
                    </span>
                    <div className="flex shrink-0 items-center gap-1">
                      <button onClick={() => togglePublished(row)} className="text-dark-muted hover:text-white p-2" aria-label={row.isPublished ? "Unpublish" : "Publish"} title={row.isPublished ? "Unpublish" : "Publish"}>
                        {row.isPublished ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button onClick={() => openEdit(row)} className="text-dark-muted hover:text-white p-2" aria-label="Edit"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(row)} className="text-dark-muted hover:text-red-400 p-2" aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowForm(false)} />
          <div className="relative bg-dark-card rounded-2xl border border-dark-border p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">{editing ? "Edit question" : "New question"}</h2>
              <button onClick={() => setShowForm(false)} className="text-dark-muted hover:text-white" aria-label="Close"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label htmlFor="faq-category" className="text-xs text-dark-muted block mb-1">Category</label>
                  <select id="faq-category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClass}>
                    {[...new Set([...FAQ_CATEGORIES, form.category])].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="faq-order" className="text-xs text-dark-muted block mb-1">Order</label>
                  <input id="faq-order" type="number" min={0} max={9999} value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Math.max(0, Math.min(9999, Number(e.target.value) || 0)) })} className={inputClass} />
                </div>
              </div>
              <div>
                <label htmlFor="faq-question" className="text-xs text-dark-muted block mb-1">Question</label>
                <input id="faq-question" required minLength={3} maxLength={300} value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label htmlFor="faq-answer" className="text-xs text-dark-muted block mb-1">Answer</label>
                <textarea id="faq-answer" required maxLength={4000} rows={5} value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} className={`${inputClass} resize-y`} />
              </div>
              <label className="flex items-center gap-2.5 rounded-xl border border-dark-border px-4 py-3 text-sm text-white cursor-pointer">
                <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} className="accent-brand" />
                Publish (visible on /faq and the homepage)
              </label>
              {formError && <p role="alert" className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">{formError}</p>}
              <button type="submit" disabled={saving} className="w-full bg-brand hover:bg-brand-dark text-black font-bold py-3 rounded-xl text-sm transition-all disabled:opacity-50">
                {saving ? "Saving…" : editing ? "Update" : "Create"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
