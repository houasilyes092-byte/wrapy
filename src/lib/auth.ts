import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { isNonProductionNetlifyContext, isProductionNetlifyContext } from "@/lib/deploy-context";

// Deploy previews and branch deploys must not sign sessions with the production
// secret: their JWT_SECRET is ignored, so logins fail there instead.
const jwtSecret = isNonProductionNetlifyContext ? undefined : process.env.JWT_SECRET;
const JWT_SECRET_ERROR = "JWT_SECRET must be configured with at least 32 bytes.";
// Production must keep failing the build; deploy previews do not receive the secret,
// so there the error is raised only when a session is actually signed or verified.
if (isProductionNetlifyContext && (!jwtSecret || new TextEncoder().encode(jwtSecret).byteLength < 32)) {
  throw new Error(JWT_SECRET_ERROR);
}
function getJwtSecret(): Uint8Array {
  if (!jwtSecret || new TextEncoder().encode(jwtSecret).byteLength < 32) {
    throw new Error(JWT_SECRET_ERROR);
  }
  return new TextEncoder().encode(jwtSecret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Compared against when the e-mail is unknown, so a wrong e-mail takes as long
// to reject as a wrong password and response times do not reveal accounts.
const DUMMY_HASH = "$2b$12$PQaxG47lLLAOSFDlv7G1CO4YHd3Fl4wjMx07A.cD4JyOv3DuWb.8e";
export async function burnPasswordCheck(password: string): Promise<void> {
  await bcrypt.compare(password, DUMMY_HASH).catch(() => false);
}

export const SESSION_COOKIE = "wrapy-token";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export function sessionCookieOptions(maxAge = SESSION_MAX_AGE) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge,
    path: "/",
  };
}

/** Normalised lookup: e-mails are stored lower-case, older rows may not be. */
export async function findUserByEmail(email: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${email.trim().toLowerCase()}`)
    .limit(1);
  return user ?? null;
}

/** "rabih@gmail.com" -> "r***@gmail.com", for logs only. */
export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  return at > 0 ? `${email[0]}***${email.slice(at)}` : "***";
}

/** Where to send a user after sign-in. Never another site, never /admin for customers. */
export function postLoginPath(role: string, requested?: string | null): string {
  const safe =
    requested &&
    requested.startsWith("/") &&
    !requested.startsWith("//") &&
    !requested.startsWith("/\\") &&
    !requested.startsWith("/login") &&
    !requested.startsWith("/register") &&
    !requested.startsWith("/auth/")
      ? requested
      : null;
  if (safe && (role === "admin" || !safe.startsWith("/admin"))) return safe;
  return role === "admin" ? "/admin" : "/account";
}

/** Database error code (e.g. 23505) from a Drizzle/pg error, without the query text. */
export function dbErrorCode(error: unknown): string | undefined {
  const candidates = [error, (error as { cause?: unknown } | null)?.cause];
  for (const candidate of candidates) {
    if (candidate && typeof candidate === "object" && "code" in candidate) {
      return String((candidate as { code: unknown }).code);
    }
  }
  return undefined;
}

export async function createToken(payload: {
  userId: string;
  role: string;
}): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(getJwtSecret());
}

export async function verifyToken(
  token: string
): Promise<{ userId: string; role: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as unknown as { userId: string; role: string };
  } catch {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;

  const user = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      avatarUrl: users.avatarUrl,
      role: users.role,
      loyaltyPoints: users.loyaltyPoints,
    })
    .from(users)
    .where(eq(users.id, payload.userId))
    .limit(1);

  return user[0] || null;
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return null;
  }
  return session;
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) return null;
  return session;
}
