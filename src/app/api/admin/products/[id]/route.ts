import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { productSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

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

    const [product] = await db
      .update(products)
      .set({
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        price: data.price,
        comparePrice: data.comparePrice || null,
        images: data.images,
        compatibleModels: data.compatibleModels,
        stock: data.stock,
        madeToOrder: data.madeToOrder,
        collectionId: data.collectionId || null,
        tags: data.tags,
        isBestSeller: data.isBestSeller,
        isFeatured: data.isFeatured,
        isActive: data.isActive,
        updatedAt: new Date(),
      })
      .where(and(eq(products.id, id), eq(products.isDeleted, false)))
      .returning();

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (err) {
    console.error("Update product error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const [deleted] = await db
      .update(products)
      .set({ isDeleted: true, isActive: false, updatedAt: new Date() })
      .where(and(eq(products.id, id), eq(products.isDeleted, false)))
      .returning({ id: products.id });

    if (!deleted) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    revalidatePath("/", "page");
    revalidatePath("/skins", "page");
    revalidatePath("/skins/[slug]", "page");
    revalidatePath("/collections/[slug]", "page");
    revalidatePath("/admin/products", "page");

    return NextResponse.json({ success: true, deleted: true });
  } catch (error) {
    console.error("Delete product error:", error);
    return NextResponse.json({ error: "Unable to delete product" }, { status: 500 });
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, id), eq(products.isDeleted, false)))
    .limit(1);

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json(product);
}
