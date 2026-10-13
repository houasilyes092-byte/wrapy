"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { ResponsiveTable } from "@/components/admin/ResponsiveTable";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Order {
  id: string;
  customerName: string;
  phone: string;
  total: number;
  status: string;
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

const statusColors: Record<string, string> = {
  pending: "bg-yellow-400/10 text-yellow-400",
  confirmed: "bg-blue-400/10 text-blue-400",
  preparing: "bg-purple-400/10 text-purple-400",
  shipped: "bg-cyan-400/10 text-cyan-400",
  delivered: "bg-green-400/10 text-green-400",
  cancelled: "bg-red-400/10 text-red-400",
};

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
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
    fetch(`/api/admin/orders?page=${page}&limit=20`)
      .then((res) => res.json())
      .then((json) => {
        if (!mounted) return;
        setOrders(json.data || []);
        setPagination(json.pagination || { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false });
      })
      .catch((err) => {
        if (mounted) console.error("Failed to fetch orders:", err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [pagination.page]);

  const columns = [
    {
      key: "order",
      header: "Order",
      render: (order: Order) => (
        <span className="text-xs text-white font-mono">{order.id.slice(0, 8)}...</span>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      render: (order: Order) => (
        <div>
          <p className="text-sm text-white">{order.customerName}</p>
          <p className="text-xs text-dark-muted">{order.phone}</p>
        </div>
      ),
    },
    {
      key: "total",
      header: "Total",
      render: (order: Order) => (
        <span className="text-sm text-white font-medium">{formatPrice(order.total)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (order: Order) => (
        <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full uppercase ${statusColors[order.status] || "bg-gray-400/10 text-gray-400"}`}>
          {order.status}
        </span>
      ),
    },
    {
      key: "date",
      header: "Date",
      render: (order: Order) => (
        <span className="text-xs text-dark-muted">{new Date(order.createdAt).toLocaleDateString()}</span>
      ),
    },
    {
      key: "action",
      header: "Action",
      align: "right" as const,
      className: "w-24",
      render: (order: Order) => (
        <Link
          href={`/admin/orders/${order.id}`}
          className="text-xs text-brand hover:text-brand-dark transition-colors"
        >
          View →
        </Link>
      ),
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Orders</h1>

      <ResponsiveTable
        items={orders}
        columns={columns}
        keyExtractor={(o) => o.id}
        emptyMessage="No orders yet"
        loading={loading}
        cardKeyFields={["total", "status", "date", "action"]}
      />

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 px-1">
          <p className="text-sm text-dark-muted">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} orders
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
