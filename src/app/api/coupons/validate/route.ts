import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { coupons } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const code = body?.code;
    const subtotal = body?.subtotal;

    if (typeof code !== "string" || !code.trim() || code.length > 100 || typeof subtotal !== "number" || !Number.isFinite(subtotal) || subtotal < 0) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const [coupon] = await db
      .select()
      .from(coupons)
      .where(and(eq(coupons.code, code.trim().toUpperCase()), eq(coupons.isActive, true)))
      .limit(1);

    if (!coupon) {
      return NextResponse.json({ error: "Invalid coupon code" }, { status: 400 });
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return NextResponse.json({ error: "Coupon has expired" }, { status: 400 });
    }

    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return NextResponse.json({ error: "Coupon usage limit reached" }, { status: 400 });
    }

    let discount = 0;
    let description = "";

    if (coupon.type === "percentage") {
      discount = Math.round(subtotal * (coupon.value / 100));
      description = `${coupon.value}% off`;
    } else {
      discount = coupon.value;
      description = `${(coupon.value / 1000).toFixed(1)} DT off`;
    }

    if (discount > subtotal) discount = subtotal;

    return NextResponse.json({
      code: coupon.code,
      discount,
      description,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
