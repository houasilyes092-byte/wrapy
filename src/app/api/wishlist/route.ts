import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { wishlist, products } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await db
    .select({
      id: wishlist.id,
      productId: wishlist.productId,
      product: {
        id: products.id,
        name: products.name,
        slug: products.slug,
        price: products.price,
        comparePrice: products.comparePrice,
        images: products.images,
        isBestSeller: products.isBestSeller,
        isFeatured: products.isFeatured,
      },
    })
    .from(wishlist)
    .innerJoin(products, eq(wishlist.productId, products.id))
    .where(and(eq(wishlist.userId, session.id), eq(products.isDeleted, false)));

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { productId } = body;

  if (!productId) {
    return NextResponse.json({ error: "Product ID required" }, { status: 400 });
  }

  const [product] = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.id, productId), eq(products.isActive, true), eq(products.isDeleted, false)))
    .limit(1);
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  // Check duplicate
  const [existing] = await db
    .select()
    .from(wishlist)
    .where(and(eq(wishlist.userId, session.id), eq(wishlist.productId, productId)))
    .limit(1);

  if (existing) {
    return NextResponse.json({ message: "Already in wishlist" });
  }

  await db.insert(wishlist).values({
    userId: session.id,
    productId,
  });

  return NextResponse.json({ success: true }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId");

  if (!productId) {
    return NextResponse.json({ error: "Product ID required" }, { status: 400 });
  }

  await db
    .delete(wishlist)
    .where(and(eq(wishlist.userId, session.id), eq(wishlist.productId, productId)));

  return NextResponse.json({ success: true });
}
