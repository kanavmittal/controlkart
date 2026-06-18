"use client"

import { useState } from "react"
import Link from "next/link"
import { formatDate } from "@/lib/format"
import type { ContentPostDTO } from "@/lib/data/types"

const TYPE_FILTERS = [
  { value: "", label: "All" },
  { value: "news", label: "News" },
  { value: "guide", label: "Guides" },
  { value: "case_study", label: "Case Studies" },
  { value: "application_note", label: "Application Notes" },
]

/**
 * Client-side type filter over a statically-rendered post list (SEO-friendly:
 * the full list ships as static HTML, filtering is instant and server-free).
 */
export function ResourcesBrowser({ posts }: { posts: ContentPostDTO[] }) {
  const [type, setType] = useState("")
  const filtered = type ? posts.filter((p) => p.type === type) : posts

  return (
    <>
      <div className="mt-6 flex flex-wrap gap-2">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setType(f.value)}
            className={
              type === f.value
                ? "btn-primary px-3 py-1.5 text-xs"
                : "btn-secondary px-3 py-1.5 text-xs"
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-px border border-[var(--color-line)] bg-[var(--color-line)] md:grid-cols-3">
        {filtered.map((post) => (
          <Link
            key={post.id}
            href={`/resources/${post.slug}`}
            className="group bg-[var(--color-surface)] p-6"
          >
            <div className="text-xs uppercase tracking-wide text-[var(--color-ink-faint)]">
              {post.type.replace("_", " ")} · {formatDate(post.published_at)}
            </div>
            <h2 className="mt-3 text-base font-semibold leading-snug group-hover:text-[var(--color-accent)]">
              {post.title}
            </h2>
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[var(--color-ink-muted)]">
              {post.excerpt}
            </p>
          </Link>
        ))}
      </div>

      {!filtered.length && (
        <p className="mt-8 text-sm text-[var(--color-ink-muted)]">
          No posts in this category yet.
        </p>
      )}
    </>
  )
}
