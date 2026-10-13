"use client";

import { useEffect, useState } from "react";
import { ResponsiveTable } from "@/components/admin/ResponsiveTable";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  loyaltyPoints: number;
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

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
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
    fetch(`/api/admin/customers?page=${page}&limit=20`)
      .then((res) => res.json())
      .then((json) => {
        if (!mounted) return;
        setCustomers(json.data || []);
        setPagination(json.pagination || { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false });
      })
      .catch((err) => {
        if (mounted) console.error("Failed to fetch customers:", err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [pagination.page]);

  const columns = [
    {
      key: "customer",
      header: "Customer",
      render: (c: Customer) => <span className="text-sm text-white">{c.name}</span>,
    },
    {
      key: "email",
      header: "Email",
      render: (c: Customer) => <span className="text-sm text-dark-muted">{c.email}</span>,
    },
    {
      key: "phone",
      header: "Phone",
      render: (c: Customer) => <span className="text-sm text-dark-muted">{c.phone || "—"}</span>,
    },
    {
      key: "loyalty",
      header: "Loyalty",
      render: (c: Customer) => <span className="text-sm text-brand font-medium">{c.loyaltyPoints} pts</span>,
    },
    {
      key: "joined",
      header: "Joined",
      render: (c: Customer) => <span className="text-xs text-dark-muted">{new Date(c.createdAt).toLocaleDateString()}</span>,
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Customers</h1>

      <ResponsiveTable
        items={customers}
        columns={columns}
        keyExtractor={(c) => c.id}
        emptyMessage="No customers yet"
        loading={loading}
        cardKeyFields={["email", "phone", "loyalty", "joined"]}
      />

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 px-1">
          <p className="text-sm text-dark-muted">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} customers
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
