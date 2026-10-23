import { NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { faqItems } from "@/db/schema";
import { requireAdmin, dbErrorCode } from "@/lib/auth";
import { faqItemSchema } from "@/lib/faq";

export const dynamic = "force-dynamic";

const isUuid = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

function failure(error: unknown) {
  console.error("[FAQ_ADMIN_FAILED]", { name: error instanceof Error ? error.name : "UnknownError", code: dbErrorCode(error) });
  return NextResponse.json({ error: "Server error. Please try again." }, { status: 500 });
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const rows = await db.select().from(faqItems).orderBy(asc(faqItems.category), asc(faqItems.sortOrder), asc(faqItems.createdAt));
    return NextResponse.json({ data: rows });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = faqItemSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid data." }, { status: 400 });
  try {
    const [row] = await db.insert(faqItems).values(parsed.data).returning();
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}

export async function PUT(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!isUuid(body?.id)) return NextResponse.json({ error: "ID invalide." }, { status: 400 });
  const parsed = faqItemSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid data." }, { status: 400 });
  try {
    const [row] = await db.update(faqItems).set({ ...parsed.data, updatedAt: new Date() }).where(eq(faqItems.id, body.id)).returning();
    if (!row) return NextResponse.json({ error: "Question introuvable." }, { status: 404 });
    return NextResponse.json(row);
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!isUuid(id)) return NextResponse.json({ error: "ID invalide." }, { status: 400 });
  try {
    const deleted = await db.delete(faqItems).where(eq(faqItems.id, id)).returning({ id: faqItems.id });
    if (deleted.length === 0) return NextResponse.json({ error: "Question introuvable." }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return failure(error);
  }
}
