import { NextRequest } from "next/server";
import crypto from "crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createToken, hashPassword } from "@/lib/auth";
import { redirectToPath } from "@/lib/redirect";

export async function GET(request: NextRequest) {
  const jar = await cookies(); const state = request.nextUrl.searchParams.get("state"); const savedState = jar.get("wrapy-google-state")?.value;
  const fail = (reason: string) => { const response = redirectToPath(`/login?error=${reason}`); response.cookies.delete("wrapy-google-state"); return response; };
  if (!state || !savedState || state !== savedState) return fail("google_state");
  const code = request.nextUrl.searchParams.get("code"); if (!code) return fail("google_denied");
  const clientId = process.env.GOOGLE_CLIENT_ID; const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${request.nextUrl.origin}/auth/google/callback`;
  if (!clientId || !clientSecret) return fail("google_not_configured");
  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }), cache: "no-store" });
    if (!tokenResponse.ok) return fail("google_auth");
    const token = await tokenResponse.json() as { access_token?: string };
    if (!token.access_token) return fail("google_auth");
    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", { headers: { Authorization: `Bearer ${token.access_token}` }, cache: "no-store" });
    if (!profileResponse.ok) return fail("google_auth");
    const profile = await profileResponse.json() as { email?: string; verified_email?: boolean; name?: string; picture?: string };
    if (!profile.email || !profile.verified_email) return fail("google_email");
    const email = profile.email.trim().toLowerCase();
    let [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      [user] = await db.insert(users).values({ name: profile.name?.slice(0,255) || email.split("@")[0], email, passwordHash: await hashPassword(crypto.randomBytes(48).toString("hex")), role: "customer" }).returning();
    }
    const sessionToken = await createToken({ userId: user.id, role: user.role });
    const response = redirectToPath(user.role === "admin" ? "/admin" : "/account");
    response.cookies.set("wrapy-token", sessionToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 60 * 60 * 24 * 7, path: "/" }); response.cookies.delete("wrapy-google-state"); return response;
  } catch (error) { console.error("Google sign-in error:", error); return fail("google_auth"); }
}
