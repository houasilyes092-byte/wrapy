import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderItems, products, coupons, settings, users } from "@/db/schema";
import { checkoutSchema } from "@/lib/validations";
import { getSession } from "@/lib/auth";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/utils";
import { eq, and, sql } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = checkoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const idempotencyKey = data.idempotencyKey;

    // Check for existing order with same idempotency key (duplicate submission prevention)
    if (idempotencyKey) {
      const [existingOrder] = await db
        .select()
        .from(orders)
        .where(eq(orders.idempotencyKey, idempotencyKey))
        .limit(1);

      if (existingOrder) {
        return NextResponse.json({ orderId: existingOrder.id, duplicate: true });
      }
    }

    // Validate each product and calculate subtotal server-side
    let subtotal = 0;
    const validatedItems: {
      productId: string;
      productName: string;
      productImage: string | null;
      phoneModel: string;
      quantity: number;
      price: number;
      total: number;
      madeToOrder: boolean;
    }[] = [];

    for (const item of data.items) {
      const [product] = await db
        .select()
        .from(products)
        .where(and(eq(products.id, item.productId), eq(products.isActive, true), eq(products.isDeleted, false)))
        .limit(1);

      if (!product) {
        return NextResponse.json(
          { error: `Product not found: ${item.productId}` },
          { status: 400 }
        );
      }

      if (!product.madeToOrder && product.stock < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${product.name}` },
          { status: 400 }
        );
      }

      // Validate phone model
      if (product.compatibleModels.length > 0 && item.phoneModel) {
        if (!product.compatibleModels.includes(item.phoneModel)) {
          return NextResponse.json(
            { error: `Invalid phone model for ${product.name}` },
            { status: 400 }
          );
        }
      }

      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;

      validatedItems.push({
        productId: product.id,
        productName: product.name,
        productImage: product.images[0] || null,
        phoneModel: item.phoneModel || "",
        quantity: item.quantity,
        price: product.price,
        total: itemTotal,
        madeToOrder: product.madeToOrder,
      });
    }

    // Get shipping price from settings (after subtotal is known)
    const [shippingSetting] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "shipping_price"))
      .limit(1);
    const shippingPriceSetting = shippingSetting ? parseInt(shippingSetting.value) : 8000;
    const shippingPrice = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : shippingPriceSetting;

    // Validate coupon
    let discount = 0;
    let couponCode: string | null = null;

    if (data.couponCode && data.couponCode.trim()) {
      const [coupon] = await db
        .select()
        .from(coupons)
        .where(
          and(
            eq(coupons.code, data.couponCode.toUpperCase()),
            eq(coupons.isActive, true)
          )
        )
        .limit(1);

      if (coupon) {
        if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
          return NextResponse.json({ error: "Coupon has expired" }, { status: 400 });
        }
        if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
          return NextResponse.json({ error: "Coupon usage limit reached" }, { status: 400 });
        }

        if (coupon.type === "percentage") {
          discount = Math.round(subtotal * (coupon.value / 100));
        } else {
          discount = coupon.value;
        }

        // Don't let discount exceed subtotal
        if (discount > subtotal) discount = subtotal;

        couponCode = coupon.code;

        // Increment usage
        await db
          .update(coupons)
          .set({ usedCount: coupon.usedCount + 1 })
          .where(eq(coupons.id, coupon.id));
      }
    }

    const total = subtotal + shippingPrice - discount;

    // Get session for userId
    const session = await getSession();

    // Create order
    const [order] = await db
      .insert(orders)
      .values({
        userId: session?.id || null,
        customerName: data.customerName,
        phone: data.phone,
        email: data.email || null,
        address: data.address,
        city: data.city,
        postalCode: data.postalCode || null,
        notes: data.notes || null,
        subtotal,
        shippingPrice,
        discount,
        total,
        status: "pending",
        paymentMethod: "cash_on_delivery",
        couponCode,
        idempotencyKey: idempotencyKey || null,
      })
      .returning();

    // Create order items
    for (const item of validatedItems) {
      await db.insert(orderItems).values({
        orderId: order.id,
        productId: item.productId,
        productName: item.productName,
        productImage: item.productImage,
        phoneModel: item.phoneModel,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
      });
    }

    // Update stock
    for (const item of validatedItems) {
      if (item.madeToOrder) continue;
      await db
        .update(products)
        .set({ stock: sql`${products.stock} - ${item.quantity}` })
        .where(eq(products.id, item.productId));
    }

    // Award loyalty points
    if (session?.id) {
      const [pointsSetting] = await db
        .select()
        .from(settings)
        .where(eq(settings.key, "points_per_dinar"))
        .limit(1);
      const pointsPerDinar = pointsSetting ? parseInt(pointsSetting.value) : 10;
      const dinarsSpent = Math.floor(total / 1000);
      const pointsEarned = dinarsSpent * pointsPerDinar;

      if (pointsEarned > 0) {
        await db
          .update(users)
          .set({ loyaltyPoints: sql`${users.loyaltyPoints} + ${pointsEarned}` })
          .where(eq(users.id, session.id));
      }
    }

    return NextResponse.json({ orderId: order.id });
  } catch (err) {
    console.error("Order creation error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
