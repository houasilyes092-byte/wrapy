// Public site URL for canonicals, sitemap, robots and structured data.
// Override with NEXT_PUBLIC_SITE_URL when the custom domain goes live.
export const SITE_NAME = "WRAPY";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://wrapytn.netlify.app").replace(/\/+$/, "");

/** Absolute URL for a site path such as "/skins/p1". */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Image URLs in the database may be site-relative ("/products/1.png") or absolute (Supabase storage). */
export function absoluteImageUrl(src: string): string {
  return /^https?:\/\//i.test(src) ? src : absoluteUrl(src);
}
