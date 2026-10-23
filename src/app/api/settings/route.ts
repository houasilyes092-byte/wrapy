import { NextResponse } from "next/server";
import { db } from "@/db";
import { settings, faqItems } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const publicKeys = ["primary_color", "background_color", "text_color", "logo_image", "hero_media", "hero_media_type", "hero_title", "hero_subtitle", "hero_button_text", "hero_button_link", "hero_poster", "announcement_text", "featured_title", "instagram_url", "facebook_url", "phone_number", "email_address", "tiktok_url", "tutorial_video_url", "faq_items", "shipping_price", "points_per_dinar"];
    const rows = await db.select().from(settings);

    const result: Record<string, string> = {};

    for (const row of rows) {
      if (publicKeys.includes(row.key)) result[row.key] = row.value;
    }

    // Lets the footer link to /faq only when it has published questions.
    const [faq] = await db.select({ count: sql<number>`count(*)` }).from(faqItems).where(eq(faqItems.isPublished, true));
    result.has_faq = Number(faq?.count || 0) > 0 ? "true" : "false";

    return NextResponse.json(result);
  } catch (error) {
    console.error("PUBLIC SETTINGS ERROR:", error);

    return NextResponse.json(
      { error: "Failed to load settings" },
      { status: 500 }
    );
  }
}
