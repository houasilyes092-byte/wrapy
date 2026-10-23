import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function MyOrdersPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const userOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, session.id))
    .orderBy(desc(orders.createdAt));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link href="/account" className="text-xs text-dark-muted hover:text-white transition-colors mb-4 block">← Back to Account</Link>
      <h1 className="text-3xl font-bold text-white tracking-tight mb-8">My Orders</h1>

      {userOrders.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-dark-muted mb-4">No orders yet</p>
          <Link href="/skins" className="inline-flex min-h-11 items-center text-sm text-brand">Start Shopping →</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {userOrders.map((order) => (
            <div key={order.id} className="bg-dark-card rounded-2xl p-5 border border-dark-border">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm text-white font-mono">{order.id.slice(0, 8)}...</p>
                  <p className="text-xs text-dark-muted">{new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
                <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full uppercase ${
                  order.status === "delivered" ? "bg-green-400/10 text-green-400" :
                  order.status === "cancelled" ? "bg-red-400/10 text-red-400" :
                  "bg-yellow-400/10 text-yellow-400"
                }`}>
                  {order.status}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">{order.city}</span>
                <span className="text-white font-bold">{formatPrice(order.total)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
