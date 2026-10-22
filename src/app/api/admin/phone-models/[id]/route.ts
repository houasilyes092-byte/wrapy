import { NextResponse } from "next/server";
import { db } from "@/db";
import { phoneModels } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";

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