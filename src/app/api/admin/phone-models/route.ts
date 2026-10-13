import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { phoneModels } from "@/db/schema";
import { asc, eq, sql } from "drizzle-orm";
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

  const [models, totalResult] = await Promise.all([
    db
      .select()
      .from(phoneModels)
      .where(eq(phoneModels.isActive, true))
      .orderBy(asc(phoneModels.brand), asc(phoneModels.name))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(phoneModels)
      .where(eq(phoneModels.isActive, true)),
  ]);

  const total = Number(totalResult[0]?.count || 0);
  const totalPages = Math.ceil(total / limit);

  return NextResponse.json({
    data: models,
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

export async function POST(req: Request) {
  const admin = await requireAdmin();

  if (!admin) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();

    const brand = String(body.brand || "").trim();
    const name = String(body.name || "").trim();

    if (!brand || !name) {
      return NextResponse.json(
        { error: "Brand and name are required" },
        { status: 400 }
      );
    }

    const [model] = await db
      .insert(phoneModels)
      .values({
        brand,
        name,
        isActive: true,
      })
      .returning();

    return NextResponse.json(model, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";

    if (message.includes("unique")) {
      return NextResponse.json(
        { error: "This phone model already exists" },
        { status: 400 }
      );
    }

    console.error("Create phone model error:", error);

    return NextResponse.json(
  {
    error: "Failed to create phone model",
    details: message,
  },
  { status: 500 }
);
  }
}