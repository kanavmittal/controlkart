import type { Metadata } from "next"
import Link from "next/link"
import { listPosts } from "@/lib/data/content"
import { formatDate } from "@/lib/format"

export const metadata: Metadata = {
  title: "Resources - Industrial Automation News, Guides & Case Studies",
  description:
    "Selection guides, application notes, case studies and news on Selec PLCs and industrial automation in India.",
  alternates: { canonical: "/resources" },
}

const TYPE_FILTERS = [
  { value: "", label: "All" },
  { value: "news", label: "News" },
  { value: "guide", label: "Guides" },
  { value: "case_study", label: "Case Studies" },
  { value: "application_note", label: "Application Notes" },
]

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>
}) {
  const { type } = await searchParams
  const { posts } = await listPosts({ type: type || undefined, limit: 50 })

  return (
    <div className="shell py-12">
      <h1 className="text-3xl font-bold tracking-tight">Resources</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--color-ink-muted)]">
        Selection guides, application notes, case studies and product news
        from the ControlKart engineering team.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {TYPE_FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value ? `/resources?type=${f.value}` : "/resources"}
            className={
              (type ?? "") === f.value
                ? "btn-primary px-3 py-1.5 text-xs"
                : "btn-secondary px-3 py-1.5 text-xs"
            }
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-px border border-[var(--color-line)] bg-[var(--color-line)] md:grid-cols-3">
        {posts.map((post) => (
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
      {!posts.length && (
        <p className="mt-8 text-sm text-[var(--color-ink-muted)]">
          No posts in this category yet.
        </p>
      )}
    </div>
  )
}
