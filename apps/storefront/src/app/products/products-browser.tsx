"use client"

import { useState } from "react"
import Link from "next/link"
import { HttpTypes } from "@medusajs/types"
import { ProductCard } from "@/components/products/product-card"
import { SpecFilterSidebar } from "@/components/products/spec-filter-sidebar"
import type { SpecFacetDTO } from "@/lib/data/types"

type Category = { id: string; name: string; handle: string }

/**
 * Client-side catalogue browser. Category and spec-facet filtering are URL-driven
 * (server-rendered, shareable); free-text search runs in-memory on top of the
 * already-filtered set. Spec facets only appear once a category is selected,
 * because filterable specs differ per category.
 */
export function ProductsBrowser({
  products,
  categories,
  activeCategoryHandle,
  facets,
  selected,
}: {
  products: HttpTypes.StoreProduct[]
  categories: Category[]
  activeCategoryHandle: string | null
  facets: SpecFacetDTO[]
  selected: Record<string, string[]>
}) {
  const [q, setQ] = useState("")
  const query = q.trim().toLowerCase()

  const filtered = query
    ? products.filter((p) => {
        const skus = (p.variants ?? []).map((v) => v.sku ?? "").join(" ")
        const hay =
          `${p.title} ${p.subtitle ?? ""} ${(p.metadata?.mpn as string) ?? ""} ${skus}`.toLowerCase()
        return hay.includes(query)
      })
    : products

  const categoryLinkClass = (active: boolean) =>
    `block px-2 py-1 text-sm ${
      active
        ? "font-medium text-[var(--color-ink)]"
        : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
    }`

  return (
    <div className="mt-6 flex flex-col gap-8 lg:flex-row">
      <div className="w-full lg:w-60 lg:shrink-0">
        <nav>
          <h2 className="border-b border-[var(--color-line)] pb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
            Category
          </h2>
          <ul className="mt-2 flex flex-col gap-0.5">
            <li>
              {/* Changing category drops ?specs= since facets differ per category. */}
              <Link
                href="/products"
                className={categoryLinkClass(!activeCategoryHandle)}
              >
                All products
              </Link>
            </li>
            {categories.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/products?category=${c.handle}`}
                  className={categoryLinkClass(activeCategoryHandle === c.handle)}
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {activeCategoryHandle && facets.length > 0 && (
          <div className="mt-6">
            <SpecFilterSidebar facets={facets} selected={selected} />
          </div>
        )}
      </div>

      <div className="flex-1">
        <form
          onSubmit={(e) => e.preventDefault()}
          className="flex max-w-md gap-2"
        >
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, SKU or model…"
            aria-label="Search products"
            className="flex-1 border border-[var(--color-line)] px-3 py-2 text-sm outline-none focus:border-[var(--color-line-strong)]"
          />
        </form>

        <p className="mt-4 text-sm text-[var(--color-ink-muted)]">
          {filtered.length} product{filtered.length === 1 ? "" : "s"}
          {query ? ` matching “${q.trim()}”` : ""} · Prices inclusive of GST
        </p>

        {filtered.length > 0 ? (
          <div className="mt-4 grid grid-cols-1 gap-px border border-[var(--color-line)] bg-[var(--color-line)] sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <p className="mt-8 text-sm text-[var(--color-ink-muted)]">
            No products matched your filters.
          </p>
        )}
      </div>
    </div>
  )
}
