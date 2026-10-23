import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { reviews, products } from "@/db/schema";
import { desc, eq, sql, and, ilike } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { REVIEW_STATUSES, isUuid, type ReviewStatus } from "@/lib/reviews";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_PAGE_SIZE))));
  const offset = (page - 1) * limit;
  const status = searchParams.get("status");
  const rating = searchParams.get("rating");
  const search = searchParams.get("search");

  const conditions = [];
  if (status && (REVIEW_STATUSES as readonly string[]).includes(status)) conditions.push(eq(reviews.status, status));
  const ratingValue = Number(rating);
  if (rating && Number.isInteger(ratingValue) && ratingValue >= 1 && ratingValue <= 5) conditions.push(eq(reviews.rating, ratingValue));
  if (search) conditions.push(ilike(reviews.comment, `%${search.slice(0, 100)}%`));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [all, totalResult, statsResult] = await Promise.all([
    db
      .select({
        id: reviews.id,
        productId: reviews.productId,
        productName: products.name,
        customerName: reviews.customerName,
        title: reviews.title,
        rating: reviews.rating,
        comment: reviews.comment,
        isApproved: reviews.isApproved,
        status: reviews.status,
        isHomepage: reviews.isHomepage,
        createdAt: reviews.createdAt,
        verifiedPurchase: sql<boolean>`exists (select 1 from orders o join order_items oi on oi.order_id = o.id where o.user_id = ${reviews.userId} and oi.product_id = ${reviews.productId} and o.status = 'delivered')`,
      })
      .from(reviews)
      .leftJoin(products, eq(reviews.productId, products.id))
      .where(whereClause)
      .orderBy(desc(reviews.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(reviews)
      .where(whereClause),
    db
      .select({
        total: sql<number>`count(*)`,
        approved: sql<number>`count(*) filter (where status = 'approved')`,
        pending: sql<number>`count(*) filter (where status = 'pending')`,
        rejected: sql<number>`count(*) filter (where status = 'rejected')`,
        homepage: sql<number>`count(*) filter (where is_homepage = true)`,
        averageRating: sql<number>`coalesce(avg(rating)::numeric, 0)`,
      })
      .from(reviews)
      .where(whereClause),
  ]);

  const total = Number(totalResult[0]?.count || 0);
  const totalPages = Math.ceil(total / limit);

  const stats = statsResult[0] || { total: 0, approved: 0, pending: 0, rejected: 0, homepage: 0, averageRating: 0 };

  return NextResponse.json({
    data: all,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
    stats: {
      total: Number(stats.total || 0),
      approved: Number(stats.approved || 0),
      pending: Number(stats.pending || 0),
      homepage: Number(stats.homepage || 0),
      rejected: Number(stats.rejected || 0),
      averageRating: Number(stats.averageRating || 0),
    },
  });
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!isUuid(body?.id)) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  // Older clients send isApproved; map it onto the status.
  let status: ReviewStatus | undefined;
  if ((REVIEW_STATUSES as readonly unknown[]).includes(body.status)) status = body.status;
  else if (typeof body.isApproved === "boolean") status = body.isApproved ? "approved" : "pending";
  else if (body.status !== undefined || body.isApproved !== undefined) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  if (body.isHomepage !== undefined && typeof body.isHomepage !== "boolean") {
    return NextResponse.json({ error: "Invalid homepage flag" }, { status: 400 });
  }
  if (status === undefined && body.isHomepage === undefined) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const [current] = await db.select({ status: reviews.status }).from(reviews).where(eq(reviews.id, body.id)).limit(1);
  if (!current) return NextResponse.json({ error: "Review not found" }, { status: 404 });

  const nextStatus = status ?? (current.status as ReviewStatus);
  if (body.isHomepage === true && nextStatus !== "approved") {
    return NextResponse.json({ error: "Approve the review before showing it on the homepage." }, { status: 400 });
  }

  const updateData: { status?: string; isApproved?: boolean; isHomepage?: boolean } = {};
  if (status) {
    updateData.status = status;
    updateData.isApproved = status === "approved";
  }
  // Only approved reviews may stay on the homepage.
  if (nextStatus !== "approved") updateData.isHomepage = false;
  else if (body.isHomepage !== undefined) updateData.isHomepage = body.isHomepage;

  const [updated] = await db.update(reviews).set(updateData).where(eq(reviews.id, body.id)).returning({
    id: reviews.id, status: reviews.status, isApproved: reviews.isApproved, isHomepage: reviews.isHomepage,
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!isUuid(id)) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  const deleted = await db.delete(reviews).where(eq(reviews.id, id)).returning({ id: reviews.id });
  if (deleted.length === 0) return NextResponse.json({ error: "Review not found" }, { status: 404 });

  return NextResponse.json({ success: true });
}