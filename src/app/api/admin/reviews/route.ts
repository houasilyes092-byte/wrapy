import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { reviews, products } from "@/db/schema";
import { desc, eq, sql, and, ilike } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";

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
  if (status === "approved") conditions.push(eq(reviews.isApproved, true));
  if (status === "pending") conditions.push(eq(reviews.isApproved, false));
  if (rating) conditions.push(eq(reviews.rating, parseInt(rating)));
  if (search) conditions.push(ilike(reviews.comment, `%${search}%`));

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
        isHomepage: reviews.isHomepage,
        createdAt: reviews.createdAt,
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
        approved: sql<number>`count(*) filter (where is_approved = true)`,
        pending: sql<number>`count(*) filter (where is_approved = false)`,
        homepage: sql<number>`count(*) filter (where is_homepage = true)`,
        averageRating: sql<number>`coalesce(avg(rating)::numeric, 0)`,
      })
      .from(reviews)
      .where(whereClause),
  ]);

  const total = Number(totalResult[0]?.count || 0);
  const totalPages = Math.ceil(total / limit);

  const stats = statsResult[0] || { total: 0, approved: 0, pending: 0, homepage: 0, averageRating: 0 };

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
      rejected: 0,
      averageRating: Number(stats.averageRating || 0),
    },
  });
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id, isApproved, isHomepage } = body;

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  const updateData: { isApproved?: boolean; isHomepage?: boolean } = {};
  if (isApproved !== undefined) updateData.isApproved = isApproved;
  if (isHomepage !== undefined) updateData.isHomepage = isHomepage;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const [review] = await db
    .update(reviews)
    .set(updateData)
    .where(eq(reviews.id, id))
    .returning();

  return NextResponse.json(review);
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  await db.delete(reviews).where(eq(reviews.id, id));

  return NextResponse.json({ success: true });
}