import { NextResponse } from "next/server";
import { db } from "@/db";
import { phoneModels } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { cleanPhoneModelName, PHONE_MODEL_NAME_MAX } from "@/lib/phone-models";
import { findSimilarPhoneModel } from "@/lib/phone-models.server";

// Orders keep the model as plain text on each order line (no link to this table),
// so renaming, deactivating or deleting a model never changes an existing order.

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    let body: { name?: unknown; brand?: unknown; isActive?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const changes: { name?: string; brand?: string; isActive?: boolean } = {};

    if (body.name !== undefined) {
      const name = cleanPhoneModelName(String(body.name));
      if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
      if (name.length > PHONE_MODEL_NAME_MAX) {
        return NextResponse.json({ error: "Name is too long" }, { status: 400 });
      }
      changes.name = name;
    }

    if (body.brand !== undefined) {
      const brand = cleanPhoneModelName(String(body.brand));
      if (!brand) return NextResponse.json({ error: "Brand is required" }, { status: 400 });
      if (brand.length > 100) return NextResponse.json({ error: "Brand is too long" }, { status: 400 });
      changes.brand = brand;
    }

    if (body.isActive !== undefined) {
      if (typeof body.isActive !== "boolean") {
        return NextResponse.json({ error: "isActive must be true or false" }, { status: 400 });
      }
      changes.isActive = body.isActive;
    }

    if (Object.keys(changes).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    // "S22", "s 22" and "s-22" are the same phone: no two entries may collide.
    if (changes.name) {
      const similar = await findSimilarPhoneModel(changes.name, id);
      if (similar) {
        return NextResponse.json(
          { error: `This phone model already exists as "${similar.name}"` },
          { status: 409 }
        );
      }
    }

    const [updated] = await db
      .update(phoneModels)
      .set(changes)
      .where(eq(phoneModels.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Phone model not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const code = (error as { code?: string; cause?: { code?: string } })?.code
      ?? (error as { cause?: { code?: string } })?.cause?.code;

    if (code === "23505") {
      return NextResponse.json({ error: "This phone model already exists" }, { status: 409 });
    }
    // Not a valid UUID: the model cannot exist.
    if (code === "22P02") {
      return NextResponse.json({ error: "Phone model not found" }, { status: 404 });
    }

    console.error("PATCH /api/admin/phone-models/[id] error:", error);
    return NextResponse.json({ error: "Failed to update phone model" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Phone model ID is required" },
        { status: 400 }
      );
    }

    const deleted = await db
      .delete(phoneModels)
      .where(eq(phoneModels.id, id))
      .returning({ id: phoneModels.id });

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: "Phone model not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Phone model deleted successfully",
      id: deleted[0].id,
    });
  } catch (error) {
    console.error("DELETE /api/admin/phone-models/[id] error:", error);

    return NextResponse.json(
      { error: "Failed to delete phone model" },
      { status: 500 }
    );
  }
}
