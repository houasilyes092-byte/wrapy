import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, collections } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { productSchema } from "@/lib/validations";

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

  const [allProducts, totalResult] = await Promise.all([
    db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        price: products.price,
        comparePrice: products.comparePrice,
        images: products.images,
        stock: products.stock,
        madeToOrder: products.madeToOrder,
        collectionId: products.collectionId,
        isBestSeller: products.isBestSeller,
        isFeatured: products.isFeatured,
        isActive: products.isActive,
        createdAt: products.createdAt,
      })
      .from(products)
      .where(eq(products.isDeleted, false))
      .orderBy(desc(products.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(eq(products.isDeleted, false)),
  ]);

  const total = Number(totalResult[0]?.count || 0);
  const totalPages = Math.ceil(total / limit);

  // Get collections for names
  const allCollections = await db.select({ id: collections.id, name: collections.name }).from(collections);
  const colMap: Record<string, string> = {};
  for (const c of allCollections) {
    colMap[c.id] = c.name;
  }

  const result = allProducts.map((p) => ({
    ...p,
    collectionName: p.collectionId ? colMap[p.collectionId] || null : null,
  }));

  return NextResponse.json({
    data: result,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = productSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Every design is available for every active phone model: products carry no model list.
    const [product] = await db
      .insert(products)
      .values({
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        price: data.price,
        comparePrice: data.comparePrice || null,
        images: data.images,
        stock: data.stock,
        madeToOrder: data.madeToOrder,
        collectionId: data.collectionId || null,
        tags: data.tags,
        isBestSeller: data.isBestSeller,
        isFeatured: data.isFeatured,
        isActive: data.isActive,
      })
      .returning();

    return NextResponse.json(product, { status: 201 });
  } catch (err: unknown) {
    const error = err as Error & { code?: string; constraint?: string; cause?: unknown };
    const cause = error.cause as { code?: string; constraint?: string; message?: string } | undefined;
    const code = error.code || cause?.code;
    const constraint = error.constraint || cause?.constraint;
    const message = error.message || cause?.message || "Unknown database error";

    if (code === "23505" && (!constraint || constraint.includes("slug"))) {
      return NextResponse.json({ error: "Product slug already exists" }, { status: 409 });
    }

    console.error("Create product error:", { code, constraint, message });
    return NextResponse.json(
      {
        error: "Unable to create product. Check the product details and try again.",
        ...(process.env.NODE_ENV !== "production" && {
          details: `${code ? `PostgreSQL ${code}: ` : ""}${message}`,
        }),
      },
      { status: 500 }
    );
  }
}
