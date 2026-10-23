import { NextResponse } from "next/server";

/**
 * Redirect to a path on the site the browser is already on.
 *
 * On Netlify, request.url inside a function is the deploy URL
 * (main--<site>.netlify.app), not the address the visitor typed. An absolute
 * redirect built from it moves the visitor to another host, where their
 * session cookie does not exist. A relative Location is resolved by the
 * browser against the URL it requested, so the visitor stays on the same host.
 */
export function redirectToPath(path: string, status: 303 | 307 = 303) {
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new Error("redirectToPath only accepts same-site paths");
  }
  return new NextResponse(null, { status, headers: { Location: path } });
}
