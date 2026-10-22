import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

// Guests prove ownership of their confirmation page with a random token kept in
// an httpOnly cookie scoped to that one page. Only its SHA-256 is stored, and
// it never appears in a URL, so it cannot leak through links or access logs.
export const ORDER_ACCESS_TTL_SECONDS = 7 * 24 * 60 * 60;

export function orderAccessCookieName(orderId: string) {
  return `wrapy-order-${orderId}`;
}

export function orderAccessPath(orderId: string) {
  return `/order-success/${orderId}`;
}

export function createOrderAccessToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashOrderAccessToken(token) };
}

export function hashOrderAccessToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function isValidOrderAccessToken(
  token: string | undefined,
  storedHash: string | null,
  createdAt: Date,
  now = new Date()
) {
  if (!token || !storedHash) return false;
  if (now.getTime() - createdAt.getTime() > ORDER_ACCESS_TTL_SECONDS * 1000) return false;
  const a = Buffer.from(hashOrderAccessToken(token), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
