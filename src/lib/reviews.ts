import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { products, reviews } from "@/db/schema";

export const REVIEW_STATUSES = ["pending", "approved", "rejected"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const isUuid = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export interface PublicReview {
  id: string;
  customerName: string | null;
  title: string | null;
  rating: number;
  comment: string | null;
  createdAt: Date;
  verifiedPurchase: boolean;
}

// True only when the reviewer's account has a delivered order containing this product.
const verifiedPurchase = sql<boolean>`exists (
  select 1 from orders o join order_items oi on oi.order_id = o.id
  where o.user_id = ${reviews.userId} and oi.product_id = ${reviews.productId} and o.status = 'delivered'
)`;

/** Approved reviews of one live product, newest first. Never exposes user ids. */
export async function getApprovedReviews(productId: string): Promise<PublicReview[]> {
  const rows = await db
    .select({
      id: reviews.id,
      customerName: reviews.customerName,
      title: reviews.title,
      rating: reviews.rating,
      comment: reviews.comment,
      createdAt: reviews.createdAt,
      verifiedPurchase,
    })
    .from(reviews)
    .innerJoin(products, eq(reviews.productId, products.id))
    .where(and(eq(reviews.productId, productId), eq(reviews.isApproved, true), eq(products.isDeleted, false)))
    .orderBy(desc(reviews.createdAt));
  return rows.map((row) => ({ ...row, verifiedPurchase: Boolean(row.verifiedPurchase) }));
}

/** "Rabih Wassim" -> "Rabih W." so public reviews never show a full name. */
export function publicReviewerName(fullName: string | null | undefined): string {
  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Client";
  const first = parts[0].slice(0, 40);
  return parts.length > 1 ? `${first} ${parts[parts.length - 1][0].toUpperCase()}.` : first;
}
