import crypto from "crypto";
import { isNonProductionNetlifyContext } from "@/lib/deploy-context";

export const GOOGLE_FLOW_COOKIE = "wrapy-google-flow";
export const GOOGLE_FLOW_MAX_AGE = 600;

const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

export interface GoogleFlow {
  state: string;
  verifier: string;
  next: string | null;
  mode: "login" | "register";
}

export interface GoogleProfile {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
}

export function googleConfig() {
  // Previews must not use the production OAuth client; sign-in reports "not configured" there.
  if (isNonProductionNetlifyContext) return null;
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (!clientId || !clientSecret || !redirectUri) return null;
  return { clientId, clientSecret, redirectUri };
}

const base64url = (buffer: Buffer) => buffer.toString("base64url");

export function newGoogleFlow(next: string | null, mode: GoogleFlow["mode"]): GoogleFlow {
  return {
    state: base64url(crypto.randomBytes(32)),
    verifier: base64url(crypto.randomBytes(48)),
    next,
    mode,
  };
}

export function encodeFlow(flow: GoogleFlow): string {
  return Buffer.from(JSON.stringify(flow)).toString("base64url");
}

export function decodeFlow(raw: string | undefined): GoogleFlow | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (typeof value?.state !== "string" || typeof value?.verifier !== "string") return null;
    return {
      state: value.state,
      verifier: value.verifier,
      next: typeof value.next === "string" ? value.next : null,
      mode: value.mode === "register" ? "register" : "login",
    };
  } catch {
    return null;
  }
}

export function statesMatch(expected: string, received: string | null): boolean {
  if (!received) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function authorizationUrl(config: NonNullable<ReturnType<typeof googleConfig>>, flow: GoogleFlow): string {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", flow.state);
  url.searchParams.set("code_challenge", base64url(crypto.createHash("sha256").update(flow.verifier).digest()));
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

/** Exchanges the authorization code and reads the signed-in Google account. */
export async function fetchGoogleProfile(
  config: NonNullable<ReturnType<typeof googleConfig>>,
  code: string,
  verifier: string
): Promise<GoogleProfile | null> {
  const tokenResponse = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
    cache: "no-store",
  });
  if (!tokenResponse.ok) {
    const detail = (await tokenResponse.json().catch(() => null)) as { error?: string } | null;
    console.error("[GOOGLE_TOKEN_FAILED]", { status: tokenResponse.status, error: detail?.error });
    return null;
  }
  const token = (await tokenResponse.json()) as { access_token?: string };
  if (!token.access_token) return null;

  const profileResponse = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${token.access_token}` },
    cache: "no-store",
  });
  if (!profileResponse.ok) {
    console.error("[GOOGLE_USERINFO_FAILED]", { status: profileResponse.status });
    return null;
  }
  const profile = (await profileResponse.json()) as {
    sub?: string;
    email?: string;
    email_verified?: boolean | string;
    name?: string;
  };
  if (!profile.sub || !profile.email) return null;
  return {
    sub: profile.sub,
    email: profile.email.trim().toLowerCase(),
    emailVerified: profile.email_verified === true || profile.email_verified === "true",
    name: profile.name?.trim() || null,
  };
}
