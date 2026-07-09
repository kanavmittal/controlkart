import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { infoPages } from "@/config/info-pages"
import { Breadcrumbs } from "@/components/shared/breadcrumbs"

type Props = { params: Promise<{ slug: string }> }

// Static info pages (About Us, Contact Us, FAQ, policies…) — content lives
// in `config/info-pages.ts` (T4), a repo-controlled typed config, not user
// input, so `dangerouslySetInnerHTML` below is safe.

export function generateStaticParams() {
  return Object.keys(infoPages).map((slug) => ({ slug }))
}

/** First-paragraph plain-text excerpt of a page's HTML, used as a fallback
 *  meta description when the config doesn't provide one. Strips tags/HTML
 *  comments and collapses whitespace; content is repo-controlled config. */
function deriveDescription(html: string): string | undefined {
  const firstBlock = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? html
  const text = firstBlock
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  if (!text) return undefined
  return text.length > 160 ? `${text.slice(0, 157)}...` : text
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const page = infoPages[slug]
  if (!page) return { title: "Page Not Found" }
  return {
    title: page.title,
    description: deriveDescription(page.html),
    alternates: { canonical: `/pages/${slug}` },
  }
}

export default async function InfoPage({ params }: Props) {
  const { slug } = await params
  const page = infoPages[slug]
  if (!page) notFound()

  return (
    <main>
      <Breadcrumbs crumbs={[{ label: page.title }]} />
      <div className="athens-container my-[60px]">
        <h1 className="mb-6 athens-page-title">
          {page.title}
        </h1>
        <div
          className="athens-rte max-w-[900px]"
          dangerouslySetInnerHTML={{ __html: page.html }}
        />
      </div>
    </main>
  )
}
