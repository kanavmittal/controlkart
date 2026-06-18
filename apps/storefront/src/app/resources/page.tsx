import type { Metadata } from "next"
import { listPosts } from "@/lib/data/content"
import { ResourcesBrowser } from "./resources-browser"

export const revalidate = 1800

export const metadata: Metadata = {
  title: "Resources - Industrial Automation News, Guides & Case Studies",
  description:
    "Selection guides, application notes, case studies and news on Selec PLCs and industrial automation in India.",
  alternates: { canonical: "/resources" },
}

export default async function ResourcesPage() {
  // Static list (ISR) — type filtering happens client-side in ResourcesBrowser.
  const { posts } = await listPosts({ limit: 50 })

  return (
    <div className="shell py-12">
      <h1 className="text-3xl font-bold tracking-tight">Resources</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--color-ink-muted)]">
        Selection guides, application notes, case studies and product news from
        the ControlKart engineering team.
      </p>
      <ResourcesBrowser posts={posts} />
    </div>
  )
}
