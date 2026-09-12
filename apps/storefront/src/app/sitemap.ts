import type { MetadataRoute } from "next"
import { listProducts } from "@/lib/data/products"
import { listCategories } from "@/lib/data/categories"
import { listPosts } from "@/lib/data/content"
import { SEO_BASE_URL as BASE_URL } from "@/lib/config"
import { infoPages } from "@/config/info-pages"

// ISR: regenerated periodically; falls back to static pages if the backend is
// briefly unreachable at build/runtime. Always current for search engines.
export const revalidate = 3600

async function allProducts() {
  const items = []
  for (let offset = 0; ; offset += 100) {
    const { products, count } = await listProducts({ limit: 100, offset })
    items.push(...products)
    if (!products.length || offset + products.length >= count) return items
  }
}

async function allPosts() {
  const items = []
  for (let offset = 0; ; offset += 100) {
    const { posts, count } = await listPosts({ limit: 100, offset })
    items.push(...posts)
    if (!posts.length || offset + posts.length >= count) return items
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/products`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/categories`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/brands`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/quick-order`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/request-quote`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/resources`, changeFrequency: "daily", priority: 0.8 },
    ...Object.keys(infoPages).map((slug) => ({
      url: `${BASE_URL}/pages/${slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.4,
    })),
  ]

  try {
    const [products, categories, posts] = await Promise.all([
      allProducts(),
      listCategories(),
      allPosts(),
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
