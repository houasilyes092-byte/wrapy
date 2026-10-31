"use client";

import { useEffect, useState, use } from "react";
import { formatPrice } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { ResponsiveTable } from "@/components/admin/ResponsiveTable";

interface OrderDetail {
  order: {
    id: string;
    customerName: string;
    phone: string;
    email: string | null;
    address: string;
    city: string;
    postalCode: string | null;
    notes: string | null;
    subtotal: number;
    shippingPrice: number;
    discount: number;
    loyaltyDiscount: number;
    total: number;
    status: string;
    couponCode: string | null;
    createdAt: string;
  };
  items: {
    id: string;
    productName: string;
    productImage: string | null;
    phoneModel: string | null;
    quantity: number;
    price: number;
    total: number;
  }[];
}

const statuses = ["pending", "confirmed", "preparing", "shipped", "delivered", "cancelled"];

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [statusError, setStatusError] = useState("");

  useEffect(() => {
    fetch(`/api/admin/orders/${id}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [id]);

  async function updateStatus(status: string) {
    setUpdating(true);
    setStatusError("");
    const res = await fetch(`/api/admin/orders/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok && data) {
      setData({ ...data, order: { ...data.order, status } });
    } else if (!res.ok) {
      const body = await res.json().catch(() => null);
      setStatusError(body?.error || "Could not update status");
    }
    setUpdating(false);
  }

  if (loading) return <div className="text-center py-20 text-dark-muted">Loading...</div>;
  if (!data) return <div className="text-center py-20 text-red-400">Order not found</div>;

  const { order, items } = data;

  // Models are saved as text on each order line, so they stay readable even if
  // the model is later renamed, deactivated or deleted in Admin → Phone Models.
  const orderedModels = [...new Set(items.map((item) => item.phoneModel).filter((model): model is string => Boolean(model)))];

  const itemColumns = [
    {
      key: "product",
      header: "Product",
      render: (item: typeof items[0]) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-dark shrink-0 relative">
            {item.productImage && (
              <Image src={item.productImage} alt="" fill className="object-cover" sizes="40px" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-white truncate">{item.productName}</p>
          </div>
        </div>
      ),
    },
    {
      key: "phoneModel",
      header: "Phone model",
      render: (item: typeof items[0]) => (
        <span className="text-sm text-white">{item.phoneModel || "—"}</span>
      ),
    },
    {
      key: "quantity",
      header: "Qty",
      align: "center" as const,
      render: (item: typeof items[0]) => <span className="text-sm text-white">{item.quantity}</span>,
    },
    {
      key: "price",
      header: "Price",
      align: "right" as const,
      render: (item: typeof items[0]) => <span className="text-sm text-white">{formatPrice(item.price)}</span>,
    },
    {
      key: "total",
      header: "Total",
      align: "right" as const,
      render: (item: typeof items[0]) => <span className="text-sm text-white font-medium">{formatPrice(item.total)}</span>,
    },
  ];

  return (
    <div>
      <Link href="/admin/orders" className="inline-flex items-center gap-1.5 text-sm text-dark-muted hover:text-white transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to Orders
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">
          Order <span className="text-dark-muted font-mono text-lg">{order.id.slice(0, 8)}...</span>
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer & Status */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-dark-card rounded-2xl p-6 border border-dark-border">
            <h2 className="text-lg font-semibold text-white mb-4">Customer Information</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-dark-muted">Name:</span> <span className="text-white ml-2">{order.customerName}</span></div>
              <div><span className="text-dark-muted">Phone:</span> <span className="text-white ml-2">{order.phone}</span></div>
              {order.email && <div><span className="text-dark-muted">Email:</span> <span className="text-white ml-2">{order.email}</span></div>}
              <div><span className="text-dark-muted">City:</span> <span className="text-white ml-2">{order.city}</span></div>
              <div><span className="text-dark-muted">Phone model:</span> <span className="text-white ml-2">{orderedModels.length > 0 ? orderedModels.join(", ") : "—"}</span></div>
              <div className="col-span-2"><span className="text-dark-muted">Address:</span> <span className="text-white ml-2">{order.address}</span></div>
              {order.notes && <div className="col-span-2"><span className="text-dark-muted">Notes:</span> <span className="text-white ml-2">{order.notes}</span></div>}
            </div>
          </div>

          {/* Items */}
          <div className="bg-dark-card rounded-2xl p-6 border border-dark-border">
            <h2 className="text-lg font-semibold text-white mb-4">Order Items</h2>
            <ResponsiveTable
              items={items}
              columns={itemColumns}
              keyExtractor={(item) => item.id}
              emptyMessage="No items in this order"
              loading={false}
              cardKeyFields={["quantity", "price", "total"]}
            />
          </div>
        </div>

        {/* Summary & Status */}
        <div className="space-y-6">
          <div className="bg-dark-card rounded-2xl p-6 border border-dark-border">
            <h2 className="text-lg font-semibold text-white mb-4">Update Status</h2>
            <div className="space-y-2">
              {statuses.map((s) => (
                <button
                  key={s}
                  onClick={() => updateStatus(s)}
                  disabled={updating || order.status === s}
                  className={`w-full text-left text-sm px-3 py-2.5 rounded-lg transition-all ${
                    order.status === s
                      ? "bg-brand/10 text-brand font-medium"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  } disabled:opacity-50`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
            {statusError && <p className="mt-3 text-xs text-red-400">{statusError}</p>}
          </div>

          <div className="bg-dark-card rounded-2xl p-6 border border-dark-border">
            <h2 className="text-lg font-semibold text-white mb-4">Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal</span>
                <span className="text-white">{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Shipping</span>
                <span className="text-white">{formatPrice(order.shippingPrice)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-brand">
                  <span>Discount {order.couponCode && `(${order.couponCode})`}</span>
                  <span>-{formatPrice(order.discount)}</span>
                </div>
              )}
              {order.loyaltyDiscount > 0 && (
                <div className="flex justify-between text-brand">
                  <span>Free skin (loyalty)</span>
                  <span>-{formatPrice(order.loyaltyDiscount)}</span>
                </div>
              )}
              <div className="border-t border-dark-border pt-2 flex justify-between text-white font-bold text-base">
                <span>Total</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>
            <p className="text-xs text-dark-muted mt-3">
              {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
