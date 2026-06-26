"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { sdk } from "@/lib/sdk"
import { queryKeys } from "@/lib/query-keys"
import { formatDate } from "@/lib/format"
import type { ContentPostDTO } from "@/lib/data/types"

/**
 * Below-the-fold CSR: latest posts. Renders its OWN section so it can hide
 * entirely when there are no posts (matching the prior server behavior). Uses
 * the generic SDK client for the custom /store/content/posts route.
 */
export function HomeResources() {
  const { data: posts = [], isLoading } = useQuery({
    queryKey: queryKeys.homePosts,
    queryFn: async () => {
      const res = await sdk.client.fetch<{ posts: ContentPostDTO[] }>(
        "/store/content/posts",
        { query: { limit: 3 } }
      )
      return res.posts
    },
    staleTime: 5 * 60_000,
  })

  if (isLoading || !posts.length) return null

  return (
    <section className="border-t border-[var(--color-line)] bg-[var(--color-surface-alt)]">
      <div className="shell py-20">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-bold tracking-tight">News &amp; Guides</h2>
          <Link
            href="/resources"
            className="text-sm font-medium text-[var(--color-accent)] hover:underline"
          >
            All resources →
          </Link>
        </div>
        <div className="mt-8 grid border-l border-t border-[var(--color-line)] [&>*]:border-r [&>*]:border-b [&>*]:border-[var(--color-line)] md:grid-cols-3">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/resources/${post.slug}`}
              className="group bg-[var(--color-surface)] p-6"
            >
              <div className="text-xs uppercase tracking-wide text-[var(--color-ink-faint)]">
                {post.type.replace("_", " ")} · {formatDate(post.published_at)}
              </div>
              <h3 className="mt-3 text-base font-semibold leading-snug group-hover:text-[var(--color-accent)]">
                {post.title}
              </h3>
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[var(--color-ink-muted)]">
                {post.excerpt}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
