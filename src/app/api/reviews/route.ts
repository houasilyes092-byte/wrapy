import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { products, reviews } from "@/db/schema";
import { dbErrorCode, getSession } from "@/lib/auth";
import { getApprovedReviews, isUuid, validateReviewerName } from "@/lib/reviews";

export const dynamic = "force-dynamic";

const ALREADY_REVIEWED = "Vous avez déjà donné votre avis sur ce produit.";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Connectez-vous pour laisser un avis." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const productId = body?.productId;
  const rating = Number(body?.rating);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const comment = typeof body?.comment === "string" ? body.comment.trim() : "";

  if (!isUuid(productId)) return NextResponse.json({ error: "Produit invalide." }, { status: 400 });
  const nameCheck = validateReviewerName(body?.customerName);
  if ("error" in nameCheck) return NextResponse.json({ error: nameCheck.error }, { status: 400 });
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return NextResponse.json({ error: "Choisissez une note de 1 à 5." }, { status: 400 });
  if (title.length > 100) return NextResponse.json({ error: "Le titre ne peut pas dépasser 100 caractères." }, { status: 400 });
  if (comment.length < 3 || comment.length > 2000) return NextResponse.json({ error: "Votre avis doit contenir entre 3 et 2000 caractères." }, { status: 400 });

  try {
    const [product] = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.id, productId), eq(products.isActive, true), eq(products.isDeleted, false)))
      .limit(1);
    if (!product) return NextResponse.json({ error: "Produit introuvable." }, { status: 404 });

    // One review per account and product, whatever its moderation status.
    const [existing] = await db
      .select({ id: reviews.id })
      .from(reviews)
      .where(and(eq(reviews.userId, session.id), eq(reviews.productId, productId)))
      .limit(1);
    if (existing) return NextResponse.json({ error: ALREADY_REVIEWED }, { status: 409 });

    const [created] = await db
      .insert(reviews)
      .values({
        productId,
        userId: session.id,
        // The reviewer chooses their public name; account name and e-mail are never shown.
        customerName: nameCheck.name,
        title: title || null,
        rating,
        comment,
        status: "pending",
        isApproved: false,
        isHomepage: false,
      })
      .returning({ id: reviews.id });
    return NextResponse.json({ success: true, pendingModeration: true, id: created.id }, { status: 201 });
  } catch (error) {
    if (dbErrorCode(error) === "23505") return NextResponse.json({ error: ALREADY_REVIEWED }, { status: 409 });
    console.error("[REVIEW_SUBMIT_FAILED]", { name: error instanceof Error ? error.name : "UnknownError", code: dbErrorCode(error) });
    return NextResponse.json({ error: "Impossible d'envoyer votre avis. Veuillez réessayer." }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const productId = request.nextUrl.searchParams.get("productId");
  if (!productId) return NextResponse.json({ error: "Product required." }, { status: 400 });
  if (!isUuid(productId)) return NextResponse.json({ error: "Invalid product." }, { status: 400 });
  try {
    return NextResponse.json(await getApprovedReviews(productId));
  } catch (error) {
    console.error("[REVIEWS_LIST_FAILED]", { name: error instanceof Error ? error.name : "UnknownError", code: dbErrorCode(error) });
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
