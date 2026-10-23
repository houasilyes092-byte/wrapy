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

export const REVIEW_NAME_MAX = 50;

/**
 * Public name typed by the reviewer. Trimmed, inner spaces collapsed, 1–50
 * characters (any script, e.g. Arabic). Control and bidi-override characters
 * are refused. The name is stored as text and always rendered escaped (React),
 * so HTML in it is displayed literally, never executed.
 */
export function validateReviewerName(raw: unknown): { name: string } | { error: string } {
  if (typeof raw !== "string") return { error: "Indiquez votre nom." };
  const name = raw.normalize("NFC").replace(/\s+/g, " ").trim();
  if (!name) return { error: "Indiquez votre nom." };
  if ([...name].length > REVIEW_NAME_MAX) return { error: `Votre nom ne peut pas dépasser ${REVIEW_NAME_MAX} caractères.` };
  if (/[\u0000-\u001f\u007f-\u009f‪-‮⁦-⁩]/.test(name)) return { error: "Votre nom contient des caractères non autorisés." };
  return { name };
}
