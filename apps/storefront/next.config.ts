import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Allow an isolated build while the local development server is running.
  distDir: process.env.NEXT_BUILD_DIR || ".next",
  // Self-contained server bundle for a slim production Docker image.
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "localhost" },
    ],
  },
}

export default nextConfig
