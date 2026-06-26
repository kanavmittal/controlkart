"use client"

import { useState } from "react"
import Link from "next/link"
import { HttpTypes } from "@medusajs/types"
import { ProductCard } from "@/components/products/product-card"
import { ProductGrid } from "@/components/products/product-grid"
import { SpecFilterSidebar } from "@/components/products/spec-filter-sidebar"
import { SpecSortDropdown } from "@/components/products/spec-sort-dropdown"
import type { SpecFacetDTO, SpecSortOption } from "@/lib/data/types"

type Cat = { id: string; name: string; handle: string }
type CategoryTree = Cat & { children: Cat[] }

/**
 * Client-side catalogue browser. Category (hierarchical), spec-facet filtering
 * and spec sort are URL-driven (server-rendered, shareable); free-text search
 * runs in-memory on top of the already-filtered set. Selecting a parent
 * category aggregates its sub-categories' products.
 */
export function ProductsBrowser({
  products,
  categories,
  activeCategoryHandle,
  facets,
  selected,
  sortable,
  sort,
}: {
  products: HttpTypes.StoreProduct[]
  categories: CategoryTree[]
  activeCategoryHandle: string | null
  facets: SpecFacetDTO[]
  selected: Record<string, string[]>
  sortable: SpecSortOption[]
  sort?: string
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

  const linkClass = (active: boolean, indent = false) =>
    `block px-2 py-1 text-sm ${indent ? "pl-5" : ""} ${
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
              {/* Changing category drops ?specs=/?sort= since they differ per category. */}
              <Link href="/products" className={linkClass(!activeCategoryHandle)}>
                All products
              </Link>
            </li>
            {categories.map((top) => (
              <li key={top.id}>
                <Link
                  href={`/products?category=${top.handle}`}
                  className={linkClass(activeCategoryHandle === top.handle)}
                >
                  {top.name}
                </Link>
                {top.children.length > 0 && (
                  <ul className="flex flex-col gap-0.5">
                    {top.children.map((child) => (
                      <li key={child.id}>
                        <Link
                          href={`/products?category=${child.handle}`}
                          className={linkClass(
                            activeCategoryHandle === child.handle,
                            true
                          )}
                        >
                          {child.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <form
            onSubmit={(e) => e.preventDefault()}
            className="flex max-w-md flex-1 gap-2"
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
          {sortable.length > 0 && (
            <SpecSortDropdown sortable={sortable} value={sort} />
          )}
        </div>

        <p className="mt-4 text-sm text-[var(--color-ink-muted)]">
          {filtered.length} product{filtered.length === 1 ? "" : "s"}
          {query ? ` matching “${q.trim()}”` : ""} · Prices inclusive of GST
        </p>

        {filtered.length > 0 ? (
          <ProductGrid cols={3} className="mt-4">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </ProductGrid>
        ) : (
          <p className="mt-8 text-sm text-[var(--color-ink-muted)]">
            No products matched your filters.
          </p>
        )}
      </div>
    </div>
  )
}
