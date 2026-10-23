import { NextRequest } from "next/server";
import crypto from "crypto";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  createToken,
  hashPassword,
  findUserByEmail,
  maskEmail,
  postLoginPath,
  dbErrorCode,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth";
import { redirectToPath } from "@/lib/redirect";
import {
  GOOGLE_FLOW_COOKIE,
  googleConfig,
  decodeFlow,
  statesMatch,
  fetchGoogleProfile,
} from "@/lib/google-oauth";

export const dynamic = "force-dynamic";

const clearFlowCookie = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 0,
  path: "/auth/google",
};

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const flow = decodeFlow(request.cookies.get(GOOGLE_FLOW_COOKIE)?.value);
  const back = flow?.mode === "register" ? "/register" : "/login";

  const fail = (reason: string) => {
    const response = redirectToPath(`${back}?error=${reason}`);
    response.cookies.set(GOOGLE_FLOW_COOKIE, "", clearFlowCookie);
    return response;
  };

  // The flow cookie ties this callback to a sign-in this browser started.
  if (!flow || !statesMatch(flow.state, params.get("state"))) return fail("google_state");

  const googleError = params.get("error");
  if (googleError) return fail(googleError === "access_denied" ? "google_denied" : "google_auth");

  const code = params.get("code");
  if (!code) return fail("google_denied");

  const config = googleConfig();
  if (!config) return fail("google_not_configured");

  try {
    const profile = await fetchGoogleProfile(config, code, flow.verifier);
    if (!profile) return fail("google_auth");
    if (!profile.emailVerified) return fail("google_email");

    let user = await findUserByEmail(profile.email);

    if (user?.role === "admin") {
      // Administrators sign in with their password only, so a Google account
      // using the same address can never open the admin area.
      console.warn("[GOOGLE_ADMIN_REFUSED]", { email: maskEmail(profile.email) });
      return fail("google_admin");
    }

    if (!user) {
      try {
        [user] = await db
          .insert(users)
          .values({
            name: (profile.name || profile.email.split("@")[0]).slice(0, 255),
            email: profile.email,
            // Google accounts have no usable password until the customer sets one.
            passwordHash: await hashPassword(crypto.randomBytes(48).toString("hex")),
            role: "customer",
          })
          .returning();
        console.info("[AUTH_REGISTERED]", { method: "google", email: maskEmail(profile.email) });
      } catch (error) {
        // The same account was created a moment ago (double click, two tabs).
        if (dbErrorCode(error) !== "23505") throw error;
        user = await findUserByEmail(profile.email);
        if (!user) throw error;
        if (user.role === "admin") return fail("google_admin");
      }
    }

    const sessionToken = await createToken({ userId: user.id, role: user.role });
    const response = redirectToPath(postLoginPath(user.role, flow.next));
    response.cookies.set(SESSION_COOKIE, sessionToken, sessionCookieOptions());
    response.cookies.set(GOOGLE_FLOW_COOKIE, "", clearFlowCookie);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("[GOOGLE_SIGN_IN_FAILED]", {
      name: error instanceof Error ? error.name : "UnknownError",
      code: dbErrorCode(error),
    });
    return fail("google_auth");
  }
}
