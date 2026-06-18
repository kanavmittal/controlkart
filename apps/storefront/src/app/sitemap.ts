import type { MetadataRoute } from "next"
import { listProducts } from "@/lib/data/products"
import { listCategories } from "@/lib/data/categories"
import { listPosts } from "@/lib/data/content"
import { BASE_URL } from "@/lib/config"

// ISR: regenerated periodically; falls back to static pages if the backend is
// briefly unreachable at build/runtime. Always current for search engines.
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/products`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/quick-order`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/request-quote`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/resources`, changeFrequency: "daily", priority: 0.8 },
  ]

  try {
    const [{ products }, categories, { posts }] = await Promise.all([
      listProducts({ limit: 100 }),
      listCategories(),
      listPosts({ limit: 100 }),
    ])

    return [
      ...staticPages,
      ...categories.map((c) => ({
        url: `${BASE_URL}/categories/${c.handle}`,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
      ...products.map((p) => ({
        url: `${BASE_URL}/products/${p.handle}`,
        lastModified: p.updated_at ? new Date(p.updated_at) : undefined,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
      ...posts.map((post) => ({
        url: `${BASE_URL}/resources/${post.slug}`,
        lastModified: post.published_at ? new Date(post.published_at) : undefined,
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })),
    ]
  } catch {
    return staticPages
  }
}
