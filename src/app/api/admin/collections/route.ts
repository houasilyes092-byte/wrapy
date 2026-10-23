import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { collections, products } from "@/db/schema";
import { and, asc, eq, sql } from "drizzle-orm";
import { requireAdmin, dbErrorCode } from "@/lib/auth";
import { collectionSchema } from "@/lib/validations";

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

  const [all, totalResult] = await Promise.all([
    db
      .select()
      .from(collections)
      .orderBy(asc(collections.sortOrder), asc(collections.name))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(collections),
  ]);

  const total = Number(totalResult[0]?.count || 0);
  const totalPages = Math.ceil(total / limit);

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
  });
}

function collectionValues(data: ReturnType<typeof collectionSchema.parse>) {
  return {
    name: data.name,
    slug: data.slug,
    description: data.description || null,
    images: data.images || [],
    isActive: data.isActive,
    isFeatured: data.isFeatured,
    sortOrder: data.sortOrder,
  };
}

function saveError(error: unknown) {
  if (dbErrorCode(error) === "23505") {
    return NextResponse.json({ error: "A collection with this slug already exists." }, { status: 409 });
  }
  console.error("[COLLECTION_SAVE_FAILED]", { name: error instanceof Error ? error.name : "UnknownError", code: dbErrorCode(error) });
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = collectionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
  }

  try {
    const [collection] = await db.insert(collections).values(collectionValues(parsed.data)).returning();
    return NextResponse.json(collection, { status: 201 });
  } catch (error) {
    return saveError(error);
  }
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }
  const parsed = collectionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
  }

  try {
    const [collection] = await db
      .update(collections)
      .set(collectionValues(parsed.data))
      .where(eq(collections.id, id))
      .returning();
    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }
    return NextResponse.json(collection);
  } catch (error) {
    return saveError(error);
  }
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

  try {
    const result = await db.transaction(async (tx) => {
      const [{ count }] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(products)
        .where(and(eq(products.collectionId, id), eq(products.isDeleted, false)));
      if (count > 0) return { blocked: count };

      // Soft-deleted products keep their rows; unlink them so the FK allows the delete.
      await tx
        .update(products)
        .set({ collectionId: null })
        .where(and(eq(products.collectionId, id), eq(products.isDeleted, true)));
      const deleted = await tx.delete(collections).where(eq(collections.id, id)).returning({ id: collections.id });
      return { deleted: deleted.length };
    });

    if ("blocked" in result) {
      return NextResponse.json(
        { error: `This collection still has ${result.blocked} product(s). Move or delete them first.` },
        { status: 409 }
      );
    }
    if (!result.deleted) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[COLLECTION_DELETE_FAILED]", {
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
