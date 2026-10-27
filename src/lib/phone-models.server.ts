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
 * Map names sent by the product form to the exact names stored in
 * `phone_models` (active or not, so a product keeps a model that was later
 * deactivated). Duplicates are dropped; unknown names are reported.
 */
export async function resolvePhoneModelNames(names: string[]): Promise<{ names: string[]; unknown: string[] }> {
  if (names.length === 0) return { names: [], unknown: [] };
  const rows = await db.select({ name: phoneModels.name }).from(phoneModels);
  const byKey = new Map(rows.map((row) => [phoneModelKey(row.name), row.name]));
  const resolved: string[] = [];
  const unknown: string[] = [];
  const seen = new Set<string>();
  for (const name of names) {
    const key = phoneModelKey(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const stored = byKey.get(key);
    if (stored) resolved.push(stored);
    else unknown.push(name);
  }
  return { names: resolved, unknown };
}

/** Existing model that is the same phone ("S22" = "s 22" = "s-22"), if any. */
export async function findSimilarPhoneModel(name: string, excludeId?: string): Promise<{ id: string; name: string } | null> {
  const key = phoneModelLooseKey(name);
  const rows = await db.select({ id: phoneModels.id, name: phoneModels.name }).from(phoneModels);
  return rows.find((row) => row.id !== excludeId && phoneModelLooseKey(row.name) === key) ?? null;
}
