import type { MetadataRoute } from "next"
import { BASE_URL } from "@/lib/config"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/cart", "/checkout", "/account", "/order-confirmed"],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
