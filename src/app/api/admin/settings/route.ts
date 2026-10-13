import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const admin = await requireAdmin();

    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const all = await db.select().from(settings);

    const map: Record<string, string> = {};

    for (const setting of all) {
      map[setting.key] = setting.value;
    }

    return NextResponse.json(map);
  } catch (error) {
    console.error("GET /api/admin/settings error:", error);

    return NextResponse.json(
      { error: "Failed to load settings" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await requireAdmin();

    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid settings data" },
        { status: 400 }
      );
    }

    if (Object.prototype.hasOwnProperty.call(body, "faq_items")) {
      try {
        const entries = JSON.parse(String(body.faq_items));
        if (!Array.isArray(entries) || entries.length > 50 || entries.some((entry) => typeof entry?.question !== "string" || !entry.question.trim() || typeof entry?.answer !== "string" || !entry.answer.trim())) throw new Error("invalid FAQ");
      } catch {
        return NextResponse.json({ error: "FAQ must be valid JSON with a question and answer for each item." }, { status: 400 });
      }
    }
    if (Object.prototype.hasOwnProperty.call(body, "tutorial_video_url")) {
      const value = body.tutorial_video_url;
      if (typeof value !== "string" || value.length > 2000 || (value && !/^https:\/\//i.test(value) && !value.startsWith("/uploads/"))) {
        return NextResponse.json({ error: "Use an HTTPS video URL or an uploaded /uploads/ file." }, { status: 400 });
      }
    }

    for (const [key, value] of Object.entries(body)) {
      const stringValue =
        value === null || value === undefined
          ? ""
          : String(value);

      const [existing] = await db
        .select()
        .from(settings)
        .where(eq(settings.key, key))
        .limit(1);

      if (existing) {
        await db
          .update(settings)
          .set({
            value: stringValue,
            updatedAt: new Date(),
          })
          .where(eq(settings.key, key));
      } else {
        await db.insert(settings).values({
          key,
          value: stringValue,
        });
      }
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("PUT /api/admin/settings error:", error);

    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}
