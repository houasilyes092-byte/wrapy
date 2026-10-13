import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders, products, users } from "@/db/schema";
import { and, eq, sql, lt } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [totalSalesResult] = await db
    .select({ total: sql<number>`COALESCE(SUM(${orders.total}), 0)` })
    .from(orders)
    .where(eq(orders.status, "delivered"));

  const [totalOrdersResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(orders);

  const [pendingOrdersResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(orders)
    .where(eq(orders.status, "pending"));

  const [totalProductsResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(products)
    .where(eq(products.isDeleted, false));

  const [totalCustomersResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(users)
    .where(eq(users.role, "customer"));

  const [lowStockResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(products)
    .where(and(lt(products.stock, 10), eq(products.isDeleted, false)));

  return NextResponse.json({
    totalSales: Number(totalSalesResult?.total || 0),
    totalOrders: Number(totalOrdersResult?.count || 0),
    pendingOrders: Number(pendingOrdersResult?.count || 0),
    totalProducts: Number(totalProductsResult?.count || 0),
    totalCustomers: Number(totalCustomersResult?.count || 0),
    lowStockProducts: Number(lowStockResult?.count || 0),
  });
}
