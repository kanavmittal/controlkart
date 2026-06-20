/**
 * Thin Strapi (headless CMS) client used by the /store/content routes. Content
 * authoring moved from the custom `content` module to Strapi (apps/cms); these
 * routes keep their original response shape so the storefront is unchanged.
 *
 * Env: STRAPI_URL (e.g. https://cms.controlkart.com), STRAPI_TOKEN (a read-only
 * Strapi API token).
 */
const STRAPI_URL = process.env.STRAPI_URL || "http://localhost:1337"
const STRAPI_TOKEN = process.env.STRAPI_TOKEN

type StrapiPost = {
  documentId: string
  type: string
  title: string
  slug: string
  excerpt: string | null
  body: string | null
  cover_image: string | null
  seo_title: string | null
  seo_description: string | null
  related_product_ids: string | null
  publishedAt: string | null
}

async function strapiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${STRAPI_URL}${path}`, {
    headers: STRAPI_TOKEN ? { Authorization: `Bearer ${STRAPI_TOKEN}` } : {},
  })
  if (!res.ok) {
    throw new Error(`Strapi request failed: ${res.status} ${res.statusText}`)
  }
  return res.json()
}

/** List-view shape (matches the old content module select). */
function toListPost(p: StrapiPost) {
  return {
    id: p.documentId,
    type: p.type,
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt,
    cover_image: p.cover_image,
    published_at: p.publishedAt,
  }
}

/** Full post shape (single-post view). */
function toFullPost(p: StrapiPost) {
  return {
    id: p.documentId,
    type: p.type,
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt,
    body: p.body,
    cover_image: p.cover_image,
    seo_title: p.seo_title,
    seo_description: p.seo_description,
    related_product_ids: p.related_product_ids,
    published_at: p.publishedAt,
  }
}

export async function listPosts(opts: {
  type?: string
  limit: number
  offset: number
}): Promise<{ posts: ReturnType<typeof toListPost>[]; count: number }> {
  const params = new URLSearchParams()
  params.set("sort", "publishedAt:desc")
  params.set("pagination[start]", String(opts.offset))
  params.set("pagination[limit]", String(opts.limit))
  if (opts.type) params.set("filters[type][$eq]", opts.type)

  const json = await strapiFetch<{
    data: StrapiPost[]
    meta: { pagination?: { total?: number } }
  }>(`/api/posts?${params.toString()}`)

  return {
    posts: (json.data ?? []).map(toListPost),
    count: json.meta?.pagination?.total ?? json.data?.length ?? 0,
  }
}

export async function getPostBySlug(
  slug: string
): Promise<ReturnType<typeof toFullPost> | null> {
  const params = new URLSearchParams()
  params.set("filters[slug][$eq]", slug)
  params.set("pagination[limit]", "1")

  const json = await strapiFetch<{ data: StrapiPost[] }>(
    `/api/posts?${params.toString()}`
  )
  const post = json.data?.[0]
  return post ? toFullPost(post) : null
}
