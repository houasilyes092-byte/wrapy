import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Public storefront is crawlable; admin, API, account, checkout and login pages are not.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/api/",
          "/auth/",
          "/account",
          "/cart",
          "/checkout",
          "/login",
          "/register",
          "/order-success/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
