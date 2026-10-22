import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderItems, products, coupons, settings, rewardRedemptions, loyaltyTransactions } from "@/db/schema";
import { checkoutSchema } from "@/lib/validations";
import { getSession } from "@/lib/auth";
import { calculateShipping, parseShippingPrice } from "@/lib/utils";
import { REWARD_POINTS_COST } from "@/lib/constants";
import { OrderError, deductRewardPoints } from "@/lib/loyalty";
import {
  ORDER_ACCESS_TTL_SECONDS,
  createOrderAccessToken,
  orderAccessCookieName,
  orderAccessPath,
} from "@/lib/order-access";
import { eq, and, inArray, sql, asc } from "drizzle-orm";

type Session = Awaited<ReturnType<typeof getSession>>;

function isIdempotencyConflict(error: unknown): boolean {
  for (let e = error as { code?: string; constraint?: string; cause?: unknown } | undefined; e; e = e.cause as typeof e) {
    if (e.code === "23505" && (e.constraint ?? "").includes("idempotency")) return true;
  }
  return false;
}

/** Response for an order, granting this browser access to its confirmation page. */
async function respondWithOrder(orderId: string, ownerId: string | null, extra: Record<string, unknown> = {}) {
  const response = NextResponse.json({ orderId, ...extra });
  // Logged-in owners use their session; only guest orders need the cookie.
  if (!ownerId) {
    const { token, hash } = createOrderAccessToken();
    await db.update(orders).set({ accessTokenHash: hash }).where(eq(orders.id, orderId));
    response.cookies.set(orderAccessCookieName(orderId), token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: orderAccessPath(orderId),
      maxAge: ORDER_ACCESS_TTL_SECONDS,
    });
  }
  return response;
}

async function findExistingOrder(idempotencyKey: string, session: Session) {
  const [existing] = await db
    .select({ id: orders.id, userId: orders.userId })
    .from(orders)
    .where(eq(orders.idempotencyKey, idempotencyKey))
    .limit(1);
  if (!existing) return null;
  // A retried submission from the same customer returns the original order.
  // An account order is only re-confirmed for that account's session.
  if (existing.userId && existing.userId !== session?.id) {
    return NextResponse.json({ orderId: existing.id, duplicate: true });
  }
  return respondWithOrder(existing.id, existing.userId, { duplicate: true });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const idempotencyKey = data.idempotencyKey ?? null;

  try {
    // Read the session before the transaction: the pool holds one connection.
    const session = await getSession();

    if (data.reward && !session) {
      return NextResponse.json({ error: "Sign in to use your loyalty reward." }, { status: 401 });
    }

    if (idempotencyKey) {
      const existing = await findExistingOrder(idempotencyKey, session);
      if (existing) return existing;
    }

    // Merge repeated lines so stock and pricing are checked per product + model.
    const lines = new Map<string, { productId: string; phoneModel: string; quantity: number }>();
    for (const item of data.items) {
      const phoneModel = item.phoneModel?.trim() || "";
      const key = `${item.productId}::${phoneModel}`;
      const line = lines.get(key);
      if (line) line.quantity += item.quantity;
      else lines.set(key, { productId: item.productId, phoneModel, quantity: item.quantity });
    }

    const order = await db.transaction(async (tx) => {
      const productIds = [...new Set([...lines.values()].map((l) => l.productId))];

      // Lock the products (in a stable order to avoid deadlocks) so concurrent
      // checkouts serialize on stock instead of overselling.
      const locked = await tx
        .select()
        .from(products)
        .where(and(inArray(products.id, productIds), eq(products.isActive, true), eq(products.isDeleted, false)))
        .orderBy(asc(products.id))
        .for("update");
      const byId = new Map(locked.map((p) => [p.id, p]));

      const demand = new Map<string, number>();
      let subtotal = 0;
      const validatedItems = [...lines.values()].map((line) => {
        const product = byId.get(line.productId);
        if (!product) throw new OrderError(400, "A product in your cart is no longer available.");

        if (product.compatibleModels.length > 0 && line.phoneModel && !product.compatibleModels.includes(line.phoneModel)) {
          throw new OrderError(400, `Invalid phone model for ${product.name}`);
        }

        demand.set(product.id, (demand.get(product.id) ?? 0) + line.quantity);
        const total = product.price * line.quantity;
        subtotal += total;
        return {
          productId: product.id,
          productName: product.name,
          productImage: product.images[0] || null,
          phoneModel: line.phoneModel,
          quantity: line.quantity,
          price: product.price,
          total,
        };
      });

      for (const [productId, quantity] of demand) {
        const product = byId.get(productId)!;
        if (!product.madeToOrder && product.stock < quantity) {
          throw new OrderError(400, `Insufficient stock for ${product.name}`);
        }
      }

      const [shippingSetting] = await tx
        .select({ value: settings.value })
        .from(settings)
        .where(eq(settings.key, "shipping_price"))
        .limit(1);
      const shippingPrice = calculateShipping(subtotal, parseShippingPrice(shippingSetting?.value));

      // Reward: one unit of a chosen cart line becomes free, paid with points.
      let loyaltyDiscount = 0;
      let rewardLine: (typeof validatedItems)[number] | undefined;
      if (data.reward && session) {
        const rewardModel = data.reward.phoneModel?.trim() || "";
        rewardLine = validatedItems.find(
          (i) => i.productId === data.reward!.productId && i.phoneModel === rewardModel
        );
        if (!rewardLine) throw new OrderError(400, "The reward must apply to a skin in your cart.");
        await deductRewardPoints(tx, session.id, REWARD_POINTS_COST);
        loyaltyDiscount = rewardLine.price;
      }

      // Coupon: validated and counted inside the transaction; the conditional
      // update makes max-uses safe under concurrency.
      let discount = 0;
      let couponCode: string | null = null;
      if (data.couponCode && data.couponCode.trim()) {
        const [coupon] = await tx
          .select()
          .from(coupons)
          .where(and(eq(coupons.code, data.couponCode.trim().toUpperCase()), eq(coupons.isActive, true)))
          .limit(1);

        if (coupon) {
          if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
            throw new OrderError(400, "Coupon has expired");
          }
          const [counted] = await tx
            .update(coupons)
            .set({ usedCount: sql`${coupons.usedCount} + 1` })
            .where(and(
              eq(coupons.id, coupon.id),
              sql`(${coupons.maxUses} IS NULL OR ${coupons.maxUses} = 0 OR ${coupons.usedCount} < ${coupons.maxUses})`
            ))
            .returning({ id: coupons.id });
          if (!counted) throw new OrderError(400, "Coupon usage limit reached");

          const eligible = subtotal - loyaltyDiscount;
          discount = coupon.type === "percentage" ? Math.round(eligible * (coupon.value / 100)) : coupon.value;
          discount = Math.min(Math.max(discount, 0), eligible);
          couponCode = coupon.code;
        }
      }

      const total = subtotal + shippingPrice - discount - loyaltyDiscount;

      const [created] = await tx
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
          loyaltyDiscount,
          loyaltyPointsUsed: rewardLine ? REWARD_POINTS_COST : 0,
          loyaltyPointsAwarded: 0,
          total,
          status: "pending",
          paymentMethod: "cash_on_delivery",
          couponCode,
          idempotencyKey,
        })
        .returning();

      await tx.insert(orderItems).values(validatedItems.map((item) => ({ ...item, orderId: created.id })));

      for (const [productId, quantity] of demand) {
        if (byId.get(productId)!.madeToOrder) continue;
        const [updated] = await tx
          .update(products)
          .set({ stock: sql`${products.stock} - ${quantity}` })
          .where(and(eq(products.id, productId), sql`${products.stock} >= ${quantity}`))
          .returning({ id: products.id });
        if (!updated) throw new OrderError(400, `Insufficient stock for ${byId.get(productId)!.name}`);
      }

      if (rewardLine && session) {
        await tx.insert(rewardRedemptions).values({
          userId: session.id,
          productId: rewardLine.productId,
          phoneModel: rewardLine.phoneModel || "unspecified",
          pointsUsed: REWARD_POINTS_COST,
          status: "redeemed",
          orderId: created.id,
        });
        await tx.insert(loyaltyTransactions).values({
          userId: session.id,
          orderId: created.id,
          type: "reward_redeemed",
          points: -REWARD_POINTS_COST,
          description: `Free skin: ${rewardLine.productName}`,
        });
      }

      return created;
    }).catch(async (error) => {
      // A concurrent identical submission won the race: return its order.
      if (idempotencyKey && isIdempotencyConflict(error)) {
        const existing = await findExistingOrder(idempotencyKey, session);
        if (existing) return existing;
      }
      throw error;
    });

    if (order instanceof NextResponse) return order;
    return respondWithOrder(order.id, order.userId);
  } catch (err) {
    if (err instanceof OrderError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[ORDER_CREATE_FAILED]", {
      name: err instanceof Error ? err.name : "UnknownError",
      message: err instanceof Error ? err.message : "Unknown error",
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
