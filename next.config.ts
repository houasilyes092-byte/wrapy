import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Netlify sets CONTEXT only at build time. Inline it into the bundle so the
  // runtime (where Netlify does not provide CONTEXT) knows which deployment it is.
  env: {
    NETLIFY_BUILD_CONTEXT: process.env.CONTEXT ?? "",
  },
  turbopack: {
    root: projectRoot,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "**.public.blob.vercel-storage.com",
        pathname: "/**",
      },
    ],
    // Allow local images from /uploads/ to be optimized
    // In production, you may want to use a custom loader or CDN
  },
};

export default nextConfig;
