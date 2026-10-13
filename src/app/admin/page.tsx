import { db } from "@/db";
import { orders, products, users } from "@/db/schema";
import { and, eq, sql, lt, desc } from "drizzle-orm";
import { formatPrice } from "@/lib/utils";
import { DollarSign, ShoppingCart, Package, Users, AlertTriangle, Clock } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [salesResult] = await db
    .select({ total: sql<string>`COALESCE(SUM(${orders.total}), 0)` })
    .from(orders)
    .where(eq(orders.status, "delivered"));

  const [ordersCount] = await db
    .select({ count: sql<string>`COUNT(*)` })
    .from(orders);

  const [pendingCount] = await db
    .select({ count: sql<string>`COUNT(*)` })
    .from(orders)
    .where(eq(orders.status, "pending"));

  const [productsCount] = await db
    .select({ count: sql<string>`COUNT(*)` })
    .from(products)
    .where(eq(products.isDeleted, false));

  const [customersCount] = await db
    .select({ count: sql<string>`COUNT(*)` })
    .from(users)
    .where(eq(users.role, "customer"));

  const [lowStockCount] = await db
    .select({ count: sql<string>`COUNT(*)` })
    .from(products)
    .where(and(lt(products.stock, 10), eq(products.isDeleted, false)));

  const recentOrders = await db
    .select()
    .from(orders)
    .orderBy(desc(orders.createdAt))
    .limit(5);

  const stats = [
    {
      label: "Total Sales",
      value: formatPrice(Number(salesResult?.total || 0)),
      icon: DollarSign,
      color: "text-green-400",
      bg: "bg-green-400/10",
    },
    {
      label: "Total Orders",
      value: Number(ordersCount?.count || 0),
      icon: ShoppingCart,
      color: "text-blue-400",
      bg: "bg-blue-400/10",
    },
    {
      label: "Pending Orders",
      value: Number(pendingCount?.count || 0),
      icon: Clock,
      color: "text-yellow-400",
      bg: "bg-yellow-400/10",
    },
    {
      label: "Products",
      value: Number(productsCount?.count || 0),
      icon: Package,
      color: "text-purple-400",
      bg: "bg-purple-400/10",
    },
    {
      label: "Customers",
      value: Number(customersCount?.count || 0),
      icon: Users,
      color: "text-brand",
      bg: "bg-brand/10",
    },
    {
      label: "Low Stock",
      value: Number(lowStockCount?.count || 0),
      icon: AlertTriangle,
      color: "text-red-400",
      bg: "bg-red-400/10",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-dark-card rounded-2xl p-4 border border-dark-border">
            <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-xs text-dark-muted mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="bg-dark-card rounded-2xl border border-dark-border">
        <div className="px-6 py-4 border-b border-dark-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Recent Orders</h2>
          <Link href="/admin/orders" className="text-xs text-brand hover:text-brand-dark transition-colors">
            View All →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-border">
                <th className="text-left text-xs text-dark-muted font-medium px-6 py-3 uppercase tracking-wider">Customer</th>
                <th className="text-left text-xs text-dark-muted font-medium px-6 py-3 uppercase tracking-wider">Total</th>
                <th className="text-left text-xs text-dark-muted font-medium px-6 py-3 uppercase tracking-wider">Status</th>
                <th className="text-left text-xs text-dark-muted font-medium px-6 py-3 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.id} className="border-b border-dark-border/50 hover:bg-white/[0.02]">
                  <td className="px-6 py-3">
                    <p className="text-sm text-white">{order.customerName}</p>
                    <p className="text-xs text-dark-muted">{order.phone}</p>
                  </td>
                  <td className="px-6 py-3 text-sm text-white font-medium">{formatPrice(order.total)}</td>
                  <td className="px-6 py-3">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="px-6 py-3 text-xs text-dark-muted">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {recentOrders.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-dark-muted text-sm">
                    No orders yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function OrderStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-400/10 text-yellow-400",
    confirmed: "bg-blue-400/10 text-blue-400",
    preparing: "bg-purple-400/10 text-purple-400",
    shipped: "bg-cyan-400/10 text-cyan-400",
    delivered: "bg-green-400/10 text-green-400",
    cancelled: "bg-red-400/10 text-red-400",
  };

  return (
    <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full uppercase ${styles[status] || "bg-gray-400/10 text-gray-400"}`}>
      {status}
    </span>
  );
}
