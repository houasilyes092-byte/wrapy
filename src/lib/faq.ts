import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { faqItems } from "@/db/schema";

import { FAQ_CATEGORIES } from "@/lib/faq-categories";

export { FAQ_CATEGORIES };

export interface PublicFaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

export const faqItemSchema = z.object({
  category: z.string().trim().min(1, "Catégorie requise").max(100),
  question: z.string().trim().min(3, "Question requise").max(300),
  answer: z.string().trim().min(1, "Réponse requise").max(4000),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  isPublished: z.boolean().default(false),
});

/** Published questions, grouped in FAQ_CATEGORIES order, then by sortOrder. */
export async function getPublishedFaq(): Promise<PublicFaqItem[]> {
  const rows = await db
    .select({ id: faqItems.id, category: faqItems.category, question: faqItems.question, answer: faqItems.answer, sortOrder: faqItems.sortOrder })
    .from(faqItems)
    .where(eq(faqItems.isPublished, true))
    .orderBy(asc(faqItems.sortOrder), asc(faqItems.createdAt));
  const rank = (category: string) => {
    const index = (FAQ_CATEGORIES as readonly string[]).indexOf(category);
    return index === -1 ? FAQ_CATEGORIES.length : index;
  };
  return rows
    .map((row, position) => ({ row, position }))
    .sort((a, b) => rank(a.row.category) - rank(b.row.category) || a.position - b.position)
    .map(({ row }) => ({ id: row.id, category: row.category, question: row.question, answer: row.answer }));
}
