import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getPostBySlug, listPosts } from "@/lib/data/content"
import { formatDate } from "@/lib/format"
import { BASE_URL, STORE_NAME } from "@/lib/config"

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  const { posts } = await listPosts({ limit: 100 })
  return posts.map((p) => ({ slug: p.slug }))
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
    <article className="shell py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <div className="mx-auto max-w-3xl">
        <div className="text-xs uppercase tracking-wide text-[var(--color-ink-faint)]">
          {post.type.replace("_", " ")} · {formatDate(post.published_at)}
        </div>
        <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight md:text-4xl">
          {post.title}
        </h1>
        {post.excerpt && (
          <p className="mt-4 border-l-2 border-[var(--color-line-strong)] pl-4 text-base leading-relaxed text-[var(--color-ink-muted)]">
            {post.excerpt}
          </p>
        )}
        <div className="mt-8 space-y-4 text-sm leading-relaxed text-[var(--color-ink)]">
          {post.body.split("\n\n").map((paragraph, i) => (
            <p key={i} className="whitespace-pre-line">
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </article>
  )
}
