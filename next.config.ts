import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enforce consistent cache and build output directories
  distDir: ".next",
  images: {
    remotePatterns: [
      { hostname: "sentinel-cogs.s3.us-west-2.amazonaws.com" },
      { hostname: "earth-search.aws.element84.com" },
      { hostname: "tiles.maps.eox.at" },
      { hostname: "bhuvan-vec2.nrsc.gov.in" },
    ],
  },
  // Turbopack & persistent caching stability options
  experimental: {
    // Retain Turbopack compilation work across dev & build sessions
    turbopackFileSystemCacheForDev: true,
    turbopackFileSystemCacheForBuild: true,
    // Manage memory pressure cleanly without unlinking live disk cache
    turbopackMemoryEviction: "auto",
    // Prevent aggressive cache unlinking/invalidation during active development
    turbopackGc: false,
  },
  // Turbopack specific options
  turbopack: {
    // Ensures root and module resolution remain stable
  },
};

export default nextConfig;
