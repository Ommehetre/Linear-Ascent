import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: "sentinel-cogs.s3.us-west-2.amazonaws.com" },
      { hostname: "earth-search.aws.element84.com" },
      { hostname: "tiles.maps.eox.at" },
      { hostname: "bhuvan-vec2.nrsc.gov.in" },
    ],
  },
};

export default nextConfig;
