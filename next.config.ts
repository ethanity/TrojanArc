import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the Next.js dev badge: on phones it covers the bottom tab bar.
  devIndicators: false,
  cacheComponents: true,
  partialPrefetching: true,
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
