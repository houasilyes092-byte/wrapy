import "server-only";
import { db } from "@/db";
import { phoneModels } from "@/db/schema";
import { eq } from "drizzle-orm";
import { phoneModelKey, phoneModelLooseKey, sortPhoneModels, type PhoneModelOption } from "@/lib/phone-models";

/** Active phone models from the database, in display order. The single source for every selector. */
export async function getActivePhoneModels(): Promise<PhoneModelOption[]> {
  const rows = await db
    .select({ id: phoneModels.id, brand: phoneModels.brand, name: phoneModels.name })
    .from(phoneModels)
    .where(eq(phoneModels.isActive, true));
  return sortPhoneModels(rows);
}

/**
 * Active models by comparison key (case and spacing never matter), mapped to
 * the exact name stored in `phone_models`. Checkout uses it to accept only
 * active models and to save the canonical name on the order.
 */
export async function getActivePhoneModelNamesByKey(): Promise<Map<string, string>> {
  const models = await getActivePhoneModels();
  return new Map(models.map((model) => [phoneModelKey(model.name), model.name]));
}

/** Existing model that is the same phone ("S22" = "s 22" = "s-22"), if any. */
export async function findSimilarPhoneModel(name: string, excludeId?: string): Promise<{ id: string; name: string } | null> {
  const key = phoneModelLooseKey(name);
  const rows = await db.select({ id: phoneModels.id, name: phoneModels.name }).from(phoneModels);
  return rows.find((row) => row.id !== excludeId && phoneModelLooseKey(row.name) === key) ?? null;
}
