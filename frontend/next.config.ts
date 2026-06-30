import type { NextConfig } from "next";

// Backend origin the rewrite proxy forwards to (server-side only).
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN ?? "http://localhost:4001";

const nextConfig: NextConfig = {
  images: {
    // Product images are admin-provided URLs (e.g. Unsplash in the seed data),
    // so we allow any remote https/http host to be optimized by next/image.
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
  // Same-origin API: the browser calls /api/* (same origin as the app) and Next
  // proxies to the backend. This keeps the auth cookie same-site (no CORS, no
  // cross-site cookie issues) and lets us use an httpOnly cookie instead of
  // storing the JWT in JS-readable localStorage.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_ORIGIN}/api/:path*` }];
  },
};

export default nextConfig;
