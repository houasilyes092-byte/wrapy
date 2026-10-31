import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { phoneModels } from "@/db/schema";
import { asc, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { cleanPhoneModelName, PHONE_MODEL_NAME_MAX } from "@/lib/phone-models";
import { findSimilarPhoneModel } from "@/lib/phone-models.server";

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
    // The admin list shows every model, active or not, so inactive ones can be re-enabled.
    db
      .select()
      .from(phoneModels)
      .orderBy(asc(phoneModels.brand), asc(phoneModels.name))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(phoneModels),
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

    const brand = cleanPhoneModelName(String(body.brand || ""));
    const name = cleanPhoneModelName(String(body.name || ""));

    if (!brand || !name) {
      return NextResponse.json(
        { error: "Brand and name are required" },
        { status: 400 }
      );
    }
    if (brand.length > 100 || name.length > PHONE_MODEL_NAME_MAX) {
      return NextResponse.json({ error: "Brand or name is too long" }, { status: 400 });
    }

    // "S22", "s 22" and "s-22" are the same phone: one entry only.
    const similar = await findSimilarPhoneModel(name);
    if (similar) {
      return NextResponse.json(
        { error: `This phone model already exists as "${similar.name}"` },
        { status: 409 }
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
        { status: 409 }
      );
    }

    console.error("Create phone model error:", error);

    return NextResponse.json(
  { error: "Failed to create phone model" },
  { status: 500 }
);
  }
}