import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the Next.js dev badge: on phones it covers the bottom tab bar.
  devIndicators: false,
  // Let the Replit preview pane (served from a replit.dev domain) talk to the dev server.
  allowedDevOrigins: ["*.replit.dev", "**.replit.dev", "*.repl.co", "**.repl.co"],
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
