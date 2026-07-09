import type { Metadata } from "next"
import Image from "next/image"
import { notFound } from "next/navigation"
import { getPostBySlug, listPosts } from "@/lib/data/content"
import { formatDate } from "@/lib/format"
import { BASE_URL, STORE_NAME } from "@/lib/config"
import { Breadcrumbs } from "@/components/shared/breadcrumbs"
import type { ContentPostDTO } from "@/lib/data/types"

export const revalidate = 1800

const TYPE_LABELS: Record<ContentPostDTO["type"], string> = {
  news: "News",
  guide: "Guide",
  case_study: "Case Study",
  application_note: "Application Note",
}

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  // Resilient: skip prebuilding params if the backend is unreachable at build time.
  try {
    const { posts } = await listPosts({ limit: 100 })
    return posts.map((p) => ({ slug: p.slug }))
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post) return { title: "Post Not Found" }
  return {
    title: post.seo_title || post.title,
    description: post.seo_description || post.excerpt || undefined,
    alternates: { canonical: `/resources/${slug}` },
    openGraph: {
      title: post.title,
      type: "article",
      publishedTime: post.published_at ?? undefined,
    },
  }
}

/**
 * Resource article (T61). Structure ported from
 * `my-clone/src/app/blogs/news/[slug]/page.tsx` (Breadcrumbs, meta line, H1,
 * hero image, `.athens-rte` body) — `getPostBySlug`, the Article JSON-LD
 * script, ISR, `generateStaticParams`/`generateMetadata` and `notFound()`
 * are unchanged.
 *
 * Body rendering: `post.body` is markdown-ish plain text (not HTML), so the
 * pre-existing `\n\n`-paragraph split is kept verbatim — only the wrapping
 * `div` now carries `.athens-rte` for Athens paragraph/heading typography
 * (its `p`/`h2`/etc. rules apply to these plain `<p>` tags same as they
 * would to injected HTML).
 *
 * `related_product_ids` exists on `ContentPostDTO` but the pre-T61 page
 * never rendered related products from it — preserved as-is (no new
 * related-products UI added here).
 */
export default async function PostPage({ params }: Props) {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post) notFound()

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.published_at,
    author: { "@type": "Organization", name: STORE_NAME },
    publisher: { "@type": "Organization", name: STORE_NAME },
    mainEntityOfPage: `${BASE_URL}/resources/${slug}`,
  }

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <Breadcrumbs
        crumbs={[{ label: "Resources", href: "/resources" }, { label: post.title }]}
      />
      <article className="athens-container my-[60px] max-w-[980px]">
        <p className="text-[13px] text-[var(--color-athens-body)]">
          {TYPE_LABELS[post.type]} · {formatDate(post.published_at)}
        </p>
        <h1 className="mt-2 athens-article-title">
          {post.title}
        </h1>
        {post.cover_image ? (
          <Image
            src={post.cover_image}
            alt={post.title}
            width={1420}
            height={800}
            className="mt-6 w-full rounded-[5px] object-cover"
            priority
          />
        ) : null}
        <div className="athens-rte mt-8">
          {post.body.split("\n\n").map((paragraph, i) => (
            <p key={i} className="whitespace-pre-line">
              {paragraph}
            </p>
          ))}
        </div>
      </article>
    </main>
  )
}
