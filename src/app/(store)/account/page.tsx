import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import { User, Package, Heart, Star } from "lucide-react";
import AccountProfile from "@/components/AccountProfile";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const recentOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, session.id))
    .orderBy(desc(orders.createdAt))
    .limit(5);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-white tracking-tight mb-8">My Account</h1>

      <AccountProfile initialName={session.name} initialPhone={session.phone} initialAvatar={session.avatarUrl} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-dark-card rounded-2xl p-5 border border-dark-border">
          <User className="w-6 h-6 text-brand mb-3" />
          <p className="text-sm text-white font-medium">{session.name}</p>
          <p className="text-xs text-dark-muted">{session.email}</p>
        </div>
        <div className="bg-dark-card rounded-2xl p-5 border border-dark-border">
          <Star className="w-6 h-6 text-brand mb-3" />
          <p className="text-2xl font-bold text-white">{session.loyaltyPoints}</p>
          <p className="text-xs text-dark-muted">Loyalty Points</p>
        </div>
        <Link href="/account/orders" className="bg-dark-card rounded-2xl p-5 border border-dark-border hover:border-brand/30 transition-colors">
          <Package className="w-6 h-6 text-brand mb-3" />
          <p className="text-sm text-white font-medium">My Orders</p>
          <p className="text-xs text-dark-muted">View order history</p>
        </Link>
        <Link href="/account/wishlist" className="bg-dark-card rounded-2xl p-5 border border-dark-border hover:border-brand/30 transition-colors">
          <Heart className="w-6 h-6 text-brand mb-3" />
          <p className="text-sm text-white font-medium">Wishlist</p>
          <p className="text-xs text-dark-muted">Saved items</p>
        </Link>
      </div>

      {/* Recent Orders */}
      <div className="bg-dark-card rounded-2xl border border-dark-border mb-6">
        <div className="px-6 py-4 border-b border-dark-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Recent Orders</h2>
          <Link href="/account/orders" className="text-xs text-brand">View All →</Link>
        </div>
        <div className="p-4">
          {recentOrders.length === 0 ? (
            <p className="text-sm text-dark-muted text-center py-4">No orders yet</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b border-dark-border/50 last:border-0">
                  <div>
                    <p className="text-sm text-white font-mono">{order.id.slice(0, 8)}...</p>
                    <p className="text-xs text-dark-muted">{new Date(order.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-white font-medium">{formatPrice(order.total)}</p>
                    <span className={`text-[10px] uppercase ${order.status === "delivered" ? "text-green-400" : "text-yellow-400"}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <LogoutButton />
    </div>
  );
}
