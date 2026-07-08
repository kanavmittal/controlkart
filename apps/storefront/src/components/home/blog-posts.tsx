/**
 * Home BlogPosts strip (T57) — clone ref: my-clone `src/components/BlogPosts.tsx`
 * ("From the blog": SectionHeading + 2/4-col grid of cover/date/title cards).
 *
 * Server component — no interactivity, so no "use client" boundary. Unlike
 * the clone (static `data/sections.ts` posts), the posts are live
 * `ContentPostDTO`s fetched by the home page via `lib/data/content.ts`
 * `listPosts` and passed down ("config holds nothing here" — the section is
 * fully data-driven). Renders nothing when there are no posts, matching the
 * old `home-resources.tsx` hide-when-empty behavior.
 *
 * Card markup follows the clone's image/date/title stack; the cover-image
 * fallback (first-letter tile on the band background) mirrors
 * `app/resources/resources-browser.tsx`, since real posts may ship without a
 * `cover_image`. Action link goes to `/resources` per the route strategy
 * (clone's `/blogs/news` rewritten).
 */

import Image from "next/image"
import Link from "next/link"

import { formatDate } from "@/lib/format"
import type { ContentPostDTO } from "@/lib/data/types"
import { SectionHeading } from "@/components/shared/section-heading"

export interface BlogPostsProps {
  posts: ContentPostDTO[]
}

export function BlogPosts({ posts }: BlogPostsProps) {
  if (!posts.length) return null

  return (
    <section className="athens-container my-[60px]">
      <SectionHeading
        title="From the blog"
        actionLabel="All resources"
        actionHref="/resources"
      />
      <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
        {posts.map((post) => (
          <Link
            key={post.id}
            href={`/resources/${post.slug}`}
            className="group block"
          >
            <div className="relative h-[223px] w-full overflow-hidden rounded-[5px] bg-[var(--color-athens-band)]">
              {post.cover_image ? (
                <Image
                  src={post.cover_image}
                  alt={post.title}
                  fill
                  loading="lazy"
                  sizes="(min-width: 1024px) 25vw, 50vw"
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
            <p className="mt-4 text-[13px] text-[var(--color-athens-body)]">
              {formatDate(post.published_at)}
            </p>
            <h3 className="mt-1 line-clamp-2 text-[17px] font-medium leading-[1.35] text-[var(--color-athens-dark)] group-hover:underline">
              {post.title}
            </h3>
          </Link>
        ))}
      </div>
    </section>
  )
}
