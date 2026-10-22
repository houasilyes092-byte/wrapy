import { db } from "@/db";
import { orders, orderItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { getSession } from "@/lib/auth";
import { cookies } from "next/headers";
import { isValidOrderAccessToken, orderAccessCookieName } from "@/lib/order-access";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function OrderSuccessPage({ params }: PageProps) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);

  if (!order) notFound();

  const session = await getSession();
  const isOwner = !!session && (order.userId === session.id || session.role === "admin");

  // Guests (and customers on another device) prove ownership with the
  // confirmation cookie issued when the order was placed.
  const cookieStore = await cookies();
  const hasGuestAccess = isValidOrderAccessToken(
    cookieStore.get(orderAccessCookieName(id))?.value,
    order.accessTokenHash,
    order.createdAt
  );

  if (!isOwner && !hasGuestAccess) {
    // Account orders: let the customer sign in. Anything else stays hidden.
    if (!session && order.userId) redirect(`/login?redirect=/order-success/${id}`);
    notFound();
  }

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id));

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <div className="animate-fade-in">
        <CheckCircle className="w-20 h-20 text-brand mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-white mb-2">Order Confirmed!</h1>
        <p className="text-dark-muted mb-8">
          Thank you for your order. We&apos;ll prepare it right away.
        </p>

        <div className="bg-dark-card rounded-2xl p-6 border border-dark-border text-left mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Order Details</h2>
            <span className="text-xs text-brand bg-brand/10 px-2.5 py-1 rounded-full uppercase">
              {order.status}
            </span>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-gray-400">
              <span>Order ID</span>
              <span className="text-white font-mono text-xs">{order.id.slice(0, 8)}...</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Name</span>
              <span className="text-white">{order.customerName}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Phone</span>
              <span className="text-white">{order.phone}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Address</span>
              <span className="text-white text-right max-w-[200px]">{order.address}, {order.city}</span>
            </div>
          </div>

          <div className="border-t border-dark-border mt-4 pt-4 space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <div>
                  <span className="text-white">{item.productName}</span>
                  {item.phoneModel && <span className="text-dark-muted text-xs ml-2">({item.phoneModel})</span>}
                  <span className="text-dark-muted"> × {item.quantity}</span>
                </div>
                <span className="text-white">{formatPrice(item.total)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-dark-border mt-4 pt-4 space-y-2 text-sm">
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
                <span>Discount</span>
                <span>-{formatPrice(order.discount)}</span>
              </div>
            )}
            {order.loyaltyDiscount > 0 && (
              <div className="flex justify-between text-brand">
                <span>Free skin (loyalty)</span>
                <span>-{formatPrice(order.loyaltyDiscount)}</span>
              </div>
            )}
            <div className="border-t border-dark-border pt-2 flex justify-between text-white font-bold">
              <span>Total</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </div>

          <div className="mt-4 text-xs text-dark-muted">
            Payment: Cash on Delivery
          </div>
        </div>

        <Link
          href="/skins"
          className="inline-flex bg-brand hover:bg-brand-dark text-black font-bold px-8 py-4 rounded-xl text-sm uppercase tracking-wider transition-all"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
