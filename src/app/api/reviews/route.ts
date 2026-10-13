import { NextRequest, NextResponse } from "next/server";
import { and, eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { orders, orderItems, reviews, products } from "@/db/schema";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const productId = typeof body?.productId === "string" ? body.productId : "";
  const rating = Number(body?.rating);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const comment = typeof body?.comment === "string" ? body.comment.trim() : "";
  const customerName = typeof body?.customerName === "string" ? body.customerName.trim() : "";

  if (!productId || !Number.isInteger(rating) || rating < 1 || rating > 5 || comment.length > 2000 || title.length > 100 || !customerName || customerName.length > 100) {
    return NextResponse.json({ error: "Invalid review data." }, { status: 400 });
  }

  const [product] = await db.select({ id: products.id }).from(products).where(and(eq(products.id, productId), eq(products.isActive, true), eq(products.isDeleted, false))).limit(1);
  if (!product) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
                   request.headers.get("x-real-ip") ||
                   "unknown";

  const recentReview = await db.select({ id: reviews.id, createdAt: reviews.createdAt }).from(reviews)
    .where(and(eq(reviews.productId, productId), eq(reviews.customerName, customerName)))
    .orderBy(desc(reviews.createdAt))
    .limit(1);

  if (recentReview.length > 0) {
    const timeDiff = Date.now() - new Date(recentReview[0].createdAt).getTime();
    if (timeDiff < 24 * 60 * 60 * 1000) {
      return NextResponse.json({ error: "You have already submitted a review for this product recently." }, { status: 429 });
    }
  }

  try {
    const [created] = await db.insert(reviews).values({
      productId,
      customerName: customerName || null,
      title: title || null,
      rating,
      comment: comment || null,
      isApproved: false,
      isHomepage: false,
    }).returning({ id: reviews.id });
    return NextResponse.json({ success: true, pendingModeration: true, id: created.id }, { status: 201 });
  } catch (error) {
    console.error("Review submission error:", error);
    return NextResponse.json({ error: "Failed to submit review. Please try again." }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const productId = new URL(request.url).searchParams.get("productId");
  if (!productId) return NextResponse.json({ error: "Product required." }, { status: 400 });
  const data = await db
    .select({
      id: reviews.id,
      productId: reviews.productId,
      userId: reviews.userId,
      customerName: reviews.customerName,
      title: reviews.title,
      rating: reviews.rating,
      comment: reviews.comment,
      isApproved: reviews.isApproved,
      isHomepage: reviews.isHomepage,
      createdAt: reviews.createdAt,
    })
    .from(reviews)
    .innerJoin(products, eq(reviews.productId, products.id))
    .where(and(
      eq(reviews.productId, productId),
      eq(reviews.isApproved, true),
      eq(products.isDeleted, false),
    ))
    .orderBy(desc(reviews.createdAt));
  return NextResponse.json(data);
}
