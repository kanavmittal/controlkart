import type { NextConfig } from "next"

const nextConfig: NextConfig = {
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
