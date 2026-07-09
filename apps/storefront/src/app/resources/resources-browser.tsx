"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Newspaper } from "lucide-react"

import { formatDate } from "@/lib/format"
import type { ContentPostDTO } from "@/lib/data/types"
import { Badge } from "@/components/ui/badge"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"
import { cn } from "@/lib/utils"

const TYPE_FILTERS = [
  { value: "", label: "All" },
  { value: "news", label: "News" },
  { value: "guide", label: "Guides" },
  { value: "case_study", label: "Case Studies" },
  { value: "application_note", label: "Application Notes" },
]

const TYPE_LABELS: Record<ContentPostDTO["type"], string> = {
  news: "News",
  guide: "Guide",
  case_study: "Case Study",
  application_note: "Application Note",
}

/**
 * Client-side type filter over a statically-rendered post list (SEO-friendly:
 * the full list ships as static HTML, filtering is instant and server-free).
 * Fetching/filtering semantics unchanged from the pre-T60 version — only the
 * pill filter and post-card presentation are restyled.
 *
 * Filter pills: Athens pill styling ported from `components/home/deals-tabs.tsx`
 * (fixed-height white swatch, ring-shadow active state) rather than shadcn's
 * `ui/tabs.tsx` look.
 *
 * Post cards: structure ported from `my-clone/src/app/blogs/news/page.tsx`
 * (cover image, date, 2-line-clamp title) in a 2/4-col grid, with a type
 * `Badge` added alongside the date (clone's static mock has no post "type").
 */
export function ResourcesBrowser({ posts }: { posts: ContentPostDTO[] }) {
  const [type, setType] = useState("")
  const filtered = type ? posts.filter((p) => p.type === type) : posts

  return (
    <>
      <div className="mt-6 flex flex-wrap gap-[10px]">
        {TYPE_FILTERS.map((f) => {
          const isActive = type === f.value
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setType(f.value)}
              aria-pressed={isActive}
              aria-label={f.label}
              className={cn(
                "h-11 cursor-pointer rounded-[var(--radius-button)] bg-white px-5 text-[15px] font-medium whitespace-nowrap text-[var(--color-athens-dark)] transition-[box-shadow] duration-300",
                isActive
                  ? "text-primary shadow-[0_0_0_2px_var(--primary)]"
                  : "shadow-[0_0_0_1px_var(--border)]"
              )}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <Empty className="mt-10 border border-dashed border-[var(--color-athens-line)]">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Newspaper />
            </EmptyMedia>
            <EmptyTitle>No posts in this category yet</EmptyTitle>
            <EmptyDescription>
              Check back soon, or browse another category.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
          {filtered.map((post) => (
            <Link
              key={post.id}
              href={`/resources/${post.slug}`}
              className="group block"
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-[5px] bg-[var(--color-athens-band)]">
                {post.cover_image ? (
                  <Image
                    src={post.cover_image}
                    alt={post.title}
                    fill
                    loading="lazy"
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                    className="object-cover"
                  />
                ) : (
                  <div
                    className="flex size-full items-center justify-center text-2xl font-medium text-[var(--color-athens-dark)]"
                    aria-hidden
                  >
                    {post.title.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Badge variant="secondary">{TYPE_LABELS[post.type]}</Badge>
                <p className="text-[13px] text-[var(--color-athens-body)]">
                  {formatDate(post.published_at)}
                </p>
              </div>
              <h2 className="mt-1 line-clamp-2 text-[17px] font-medium leading-[1.35] text-[var(--color-athens-dark)] group-hover:underline">
                {post.title}
              </h2>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
