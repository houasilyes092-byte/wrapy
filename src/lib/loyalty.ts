import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  loyaltyTransactions,
  orders,
  rewardRedemptions,
  settings,
  users,
} from "@/db/schema";
import { POINTS_PER_DINAR, REWARD_POINTS_COST } from "@/lib/constants";

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type OrderStatus = (typeof orders.$inferSelect)["status"];

/** An expected business failure; the message is safe to show to the client. */
export class OrderError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "OrderError";
  }
}

export async function getPointsPerDinar(tx: Tx): Promise<number> {
  const [row] = await tx
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, "points_per_dinar"))
    .limit(1);
  const parsed = Number.parseInt(row?.value ?? "", 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : POINTS_PER_DINAR;
}

/**
 * Cash on Delivery: points are earned only once the order is delivered
 * (i.e. paid). Any other status, including a delivered order later cancelled,
 * holds zero earned points. Balances move by the difference between the target
 * and what was already credited, so repeated calls are idempotent.
 */
async function syncEarnedPoints(
  tx: Tx,
  order: typeof orders.$inferSelect
): Promise<number | null> {
  if (!order.userId || order.loyaltyPointsAwarded === null) return order.loyaltyPointsAwarded;

  const rate = await getPointsPerDinar(tx);
  const target = order.status === "delivered" ? Math.floor(order.total / 1000) * rate : 0;
  const delta = target - order.loyaltyPointsAwarded;
  if (delta === 0) return target;

  if (delta > 0) {
    await tx
      .update(users)
      .set({
        loyaltyPoints: sql`${users.loyaltyPoints} + ${delta}`,
        loyaltyPointsEarned: sql`${users.loyaltyPointsEarned} + ${delta}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, order.userId));
    await tx.insert(loyaltyTransactions).values({
      userId: order.userId,
      orderId: order.id,
      type: "earned",
      points: delta,
      description: `Order delivered (${Math.floor(order.total / 1000)} DT × ${rate})`,
    });
  } else {
    const owed = -delta;
    const [user] = await tx
      .select({ points: users.loyaltyPoints })
      .from(users)
      .where(eq(users.id, order.userId))
      .for("update");
    // Never push a balance below zero; record any shortfall for audit.
    const deducted = Math.min(owed, Math.max(0, user?.points ?? 0));
    await tx
      .update(users)
      .set({
        loyaltyPoints: sql`${users.loyaltyPoints} - ${deducted}`,
        loyaltyPointsEarned: sql`GREATEST(${users.loyaltyPointsEarned} - ${owed}, 0)`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, order.userId));
    await tx.insert(loyaltyTransactions).values({
      userId: order.userId,
      orderId: order.id,
      type: "reversed",
      points: -deducted,
      description:
        deducted < owed
          ? `Order no longer delivered: ${owed} pts reversed, ${owed - deducted} pts uncollectable (balance already spent)`
          : `Order no longer delivered: ${owed} pts reversed`,
    });
  }
  return target;
}

/** Refunds the reward on cancellation; re-applies it if a cancelled order is reopened. */
async function syncReward(tx: Tx, order: typeof orders.$inferSelect, previous: OrderStatus) {
  const [reward] = await tx
    .select()
    .from(rewardRedemptions)
    .where(eq(rewardRedemptions.orderId, order.id))
    .for("update");
  if (!reward) return;

  if (order.status === "cancelled" && reward.status === "redeemed") {
    await tx
      .update(users)
      .set({
        loyaltyPoints: sql`${users.loyaltyPoints} + ${reward.pointsUsed}`,
        loyaltyPointsRedeemed: sql`GREATEST(${users.loyaltyPointsRedeemed} - ${reward.pointsUsed}, 0)`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, reward.userId));
    await tx.update(rewardRedemptions).set({ status: "cancelled" }).where(eq(rewardRedemptions.id, reward.id));
    await tx.insert(loyaltyTransactions).values({
      userId: reward.userId,
      orderId: order.id,
      type: "refunded",
      points: reward.pointsUsed,
      description: "Free-skin reward refunded: order cancelled",
    });
  } else if (previous === "cancelled" && order.status !== "cancelled" && reward.status === "cancelled") {
    await deductRewardPoints(tx, reward.userId, reward.pointsUsed);
    await tx.update(rewardRedemptions).set({ status: "redeemed" }).where(eq(rewardRedemptions.id, reward.id));
    await tx.insert(loyaltyTransactions).values({
      userId: reward.userId,
      orderId: order.id,
      type: "reward_redeemed",
      points: -reward.pointsUsed,
      description: "Free-skin reward re-applied: order reopened",
    });
  }
}

/** Locks the user row and deducts reward points, refusing if the balance is short. */
export async function deductRewardPoints(tx: Tx, userId: string, points = REWARD_POINTS_COST) {
  const [user] = await tx
    .select({ points: users.loyaltyPoints })
    .from(users)
    .where(eq(users.id, userId))
    .for("update");
  if (!user || user.points < points) {
    throw new OrderError(409, `A free skin requires ${points} loyalty points.`);
  }
  await tx
    .update(users)
    .set({
      loyaltyPoints: sql`${users.loyaltyPoints} - ${points}`,
      loyaltyPointsRedeemed: sql`${users.loyaltyPointsRedeemed} + ${points}`,
      updatedAt: new Date(),
    })
    .where(and(eq(users.id, userId), sql`${users.loyaltyPoints} >= ${points}`));
}

/** Changes an order's status and keeps loyalty balances consistent, atomically. */
export async function changeOrderStatus(orderId: string, status: OrderStatus) {
  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
    if (!current) return null;

    const previous = current.status;
    const [updated] = await tx
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();

    const awarded = await syncEarnedPoints(tx, updated);
    if (awarded !== updated.loyaltyPointsAwarded) {
      await tx.update(orders).set({ loyaltyPointsAwarded: awarded }).where(eq(orders.id, orderId));
      updated.loyaltyPointsAwarded = awarded;
    }
    await syncReward(tx, updated, previous);
    return updated;
  });
}
