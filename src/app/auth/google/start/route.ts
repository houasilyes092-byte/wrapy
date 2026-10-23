import { NextRequest, NextResponse } from "next/server";
import { redirectToPath } from "@/lib/redirect";
import {
  GOOGLE_FLOW_COOKIE,
  GOOGLE_FLOW_MAX_AGE,
  googleConfig,
  newGoogleFlow,
  encodeFlow,
  authorizationUrl,
} from "@/lib/google-oauth";

export const dynamic = "force-dynamic";

function safePath(value: string | null): string | null {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : null;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode = params.get("mode") === "register" ? "register" : "login";
  const next = safePath(params.get("redirect"));

  const config = googleConfig();
  if (!config) {
    console.error("[GOOGLE_NOT_CONFIGURED]", {
      clientId: Boolean(process.env.GOOGLE_CLIENT_ID),
      clientSecret: Boolean(process.env.GOOGLE_CLIENT_SECRET),
      redirectUri: Boolean(process.env.GOOGLE_REDIRECT_URI),
    });
    return redirectToPath(`/${mode}?error=google_not_configured`);
  }

  const flow = newGoogleFlow(next, mode);
  const response = NextResponse.redirect(authorizationUrl(config, flow), 302);
  response.headers.set("Cache-Control", "no-store");
  response.cookies.set(GOOGLE_FLOW_COOKIE, encodeFlow(flow), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: GOOGLE_FLOW_MAX_AGE,
    path: "/auth/google",
  });
  return response;
}
