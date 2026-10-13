import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${request.nextUrl.origin}/auth/google/callback`;
  if (!clientId || !process.env.GOOGLE_CLIENT_SECRET) return NextResponse.redirect(new URL("/login?error=google_not_configured", request.url));
  const state = crypto.randomBytes(32).toString("hex");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId); url.searchParams.set("redirect_uri", redirectUri); url.searchParams.set("response_type", "code"); url.searchParams.set("scope", "openid email profile"); url.searchParams.set("state", state); url.searchParams.set("prompt", "select_account");
  const response = NextResponse.redirect(url); response.cookies.set("wrapy-google-state", state, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 600, path: "/" }); return response;
}
