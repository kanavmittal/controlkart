import type { Metadata } from "next"
import { listPosts } from "@/lib/data/content"
import { Breadcrumbs } from "@/components/shared/breadcrumbs"
import { ResourcesBrowser } from "./resources-browser"

export const revalidate = 1800

export const metadata: Metadata = {
  title: "Resources - Industrial Automation News, Guides & Case Studies",
  description:
    "Selection guides, application notes, case studies and news on Selec PLCs and industrial automation in India.",
  alternates: { canonical: "/resources" },
}

/**
 * Resources index (T60). Structure ported from
 * `my-clone/src/app/blogs/news/page.tsx` (Breadcrumbs, H1, 2/4-col post-card
 * grid) — the `listPosts` fetch, ISR window and client-side type filter
 * (`ResourcesBrowser`) are unchanged; only the presentation is restyled.
 */
export default async function ResourcesPage() {
  // Static list (ISR) — type filtering happens client-side in ResourcesBrowser.
  const { posts } = await listPosts({ limit: 50 })

  return (
    <main>
      <Breadcrumbs crumbs={[{ label: "Resources" }]} />
      <div className="athens-container my-[60px]">
        <h1 className="text-[28px] font-medium leading-[1.3] tracking-[-0.01em] text-[var(--color-athens-dark)]">
          Resources
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--color-athens-body)]">
          Selection guides, application notes, case studies and product news
          from the ControlKart engineering team.
        </p>
        <ResourcesBrowser posts={posts} />
      </div>
    </main>
  )
}
