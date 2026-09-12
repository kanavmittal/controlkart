import type { MetadataRoute } from "next"
import { SEO_BASE_URL as BASE_URL } from "@/lib/config"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/cart", "/checkout", "/account", "/order-confirmed", "/compare"],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
