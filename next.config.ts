import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // cacheComponents / partialPrefetching are off: OpenNext on Cloudflare doesn't fully support them yet
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
