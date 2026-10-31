// Phone models: shared helpers (client-safe, no database import).
// The `phone_models` table is the only source of model names. Server code
// reads it through "@/lib/phone-models.server"; this file only sorts, groups
// and compares names so every screen presents and matches them the same way.

export interface PhoneModelOption {
  id: string;
  brand: string;
  name: string;
}

export const PHONE_MODEL_NAME_MAX = 255;

/** Comparison key: case, spacing and Unicode form never make two models differ. */
export function phoneModelKey(name: string): string {
  return name.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Looser key that also ignores spaces and hyphens: "S22", "s 22" and "s-22"
 * are the same phone. Used to refuse near-duplicates when adding or renaming.
 */
export function phoneModelLooseKey(name: string): string {
  return phoneModelKey(name).replace(/[\s-]+/g, "");
}

/** Display form of a typed name: trimmed, single spaces. */
export function cleanPhoneModelName(name: string): string {
  return name.normalize("NFKC").trim().replace(/\s+/g, " ");
}

const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

/** Brand A–Z, then natural order inside a brand ("iPhone 9" before "iPhone 11"). */
export function sortPhoneModels<T extends { brand: string; name: string }>(models: T[]): T[] {
  return [...models].sort((a, b) => collator.compare(a.brand, b.brand) || collator.compare(a.name, b.name));
}

/** [brand, models][] in display order. */
export function groupPhoneModelsByBrand<T extends { brand: string; name: string }>(models: T[]): [string, T[]][] {
  const groups = new Map<string, T[]>();
  for (const model of sortPhoneModels(models)) {
    const list = groups.get(model.brand);
    if (list) list.push(model);
    else groups.set(model.brand, [model]);
  }
  return [...groups.entries()];
}
