import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { LayoutGrid } from "lucide-react"

import { Breadcrumbs } from "@/components/shared/breadcrumbs"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"
import { listTopLevelCategories } from "@/lib/data/categories"
import { cn } from "@/lib/utils"

export const revalidate = 300

export const metadata: Metadata = {
  title: "All Categories",
  description:
    "Browse every Selec product category — PLCs, IO modules, displays, sensors and industrial automation accessories, all in one place.",
  alternates: { canonical: "/categories" },
}

/**
 * Categories index (NEW route, T22). Grid of top-level category cards,
 * structured after the clone's collections index
 * (`my-clone/src/app/collections/page.tsx`): bordered card, media block,
 * centered label below, linking to `/categories/<handle>`. Ported to the
 * card idiom already established by `product/product-card.tsx` (border +
 * `--radius` token, `athens-band` media background) rather than the
 * clone's literal inset-shadow classes, since both resolve to the same
 * `#dfdfdf` hairline (`--border` == `--color-athens-line`).
 *
 * No backend field carries a category image today, so `metadata?.image`
 * (set-able from the admin's free-form category metadata, same convention
 * as `product.metadata.*`) is an opportunistic enhancement — categories
 * without one fall back to an `athens-band` tile with the category's
 * initial.
 *
 * Fetch resilience matches the sibling category pages
 * (`categories/[handle]/page.tsx`, `products/page.tsx`): no try/catch, ISR
 * (`revalidate = 300`) errors bubble to the route's error boundary. The
 * layout-level try/catch around `getCategoryTree()` is a special case for
 * chrome that must render on every route, not the norm for page bodies.
 */
export default async function CategoriesIndexPage() {
  const categories = await listTopLevelCategories()

  return (
    <>
      <Breadcrumbs crumbs={[{ label: "Categories" }]} />
      <div className="athens-container py-10 md:py-14">
        <h1 className="athens-section-heading text-[28px]">Categories</h1>

        {categories.length === 0 ? (
          <Empty className="mt-8 border border-dashed border-athens-line">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <LayoutGrid />
              </EmptyMedia>
              <EmptyTitle>No categories yet</EmptyTitle>
              <EmptyDescription>
                Check back soon, or browse the full catalog instead.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((category) => {
              const image =
                typeof category.metadata?.image === "string"
                  ? category.metadata.image
                  : null
              const href = `/categories/${category.handle}`

              return (
                <div key={category.id}>
                  <Link
                    href={href}
                    className={cn(
                      "group block overflow-hidden rounded-[var(--radius)] border border-border bg-white p-3 transition-colors",
                      "hover:border-athens-dark"
                    )}
                  >
                    <div className="relative aspect-square overflow-hidden rounded-[calc(var(--radius)-2px)] bg-athens-band">
                      {image ? (
                        <Image
                          src={image}
                          alt=""
                          fill
                          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                          className="object-cover"
                        />
                      ) : (
                        <div
                          className="flex size-full items-center justify-center text-3xl font-medium text-athens-dark"
                          aria-hidden
                        >
                          {category.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </Link>
                  <p className="mt-3 text-center text-sm text-athens-body">
                    <Link href={href} className="hover:text-athens-dark hover:underline">
                      {category.name}
                    </Link>
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
