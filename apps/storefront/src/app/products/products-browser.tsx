"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { Search } from "lucide-react"
import { HttpTypes } from "@medusajs/types"

import { ProductCard } from "@/components/product/product-card"
import { ProductGrid } from "@/components/product/product-grid"
import {
  CollectionSidebar,
  type CollectionSidebarCategoryLink,
} from "@/components/product/collection-sidebar"
import { CatalogToolbar } from "@/components/product/catalog-toolbar"
import { QuickViewButton } from "@/components/product/quick-view-button"
import { CompareCardCheckbox } from "@/components/product/compare-card-checkbox"
import { Input } from "@/components/ui/input"
import type { SpecFacetDTO, SpecSortOption } from "@/lib/data/types"

type Cat = { id: string; name: string; handle: string }
type CategoryTree = Cat & { children: Cat[] }

/** `min-max` — both halves optional, mirrors `CollectionSidebar`'s own
 *  `parsePriceParam`. NEW client-side-only overlay (not a preserved
 *  contract): intersected here against the already-resolved product list. */
function parsePriceOverlay(raw: string | null): {
  min: number | null
  max: number | null
} {
  if (!raw) {
    return { min: null, max: null }
  }
  const [minRaw = "", maxRaw = ""] = raw.split("-")
  const min = minRaw.trim() ? Number(minRaw) : NaN
  const max = maxRaw.trim() ? Number(maxRaw) : NaN
  return {
    min: Number.isFinite(min) ? min : null,
    max: Number.isFinite(max) ? max : null,
  }
}

/** Cheapest calculated price across a product's variants — same derivation
 *  `ProductCard` uses for its displayed price. */
function cheapestCalculatedAmount(
  product: HttpTypes.StoreProduct
): number | null {
  const amounts = (product.variants ?? [])
    .map((variant) => variant.calculated_price?.calculated_amount)
    .filter((amount): amount is number => typeof amount === "number")
  return amounts.length ? Math.min(...amounts) : null
}

/**
 * Client-side catalogue browser. Category (hierarchical), spec-facet
 * filtering and spec sort are URL-driven (server-rendered, shareable); free
 * text search runs in-memory on top of the already-filtered set, seeded from
 * `?q=` (passed down from `page.tsx` for a correct first paint — the header
 * search submits a full-page `?q=` navigation) and further editable in
 * place. A NEW `?price=<min>-<max>` overlay (read directly off the URL here)
 * is intersected against the result afterwards. Selecting a parent category
 * aggregates its sub-categories' products.
 */
export function ProductsBrowser({
  products,
  categories,
  activeCategoryHandle,
  facets,
  sortable,
  initialQuery = "",
}: {
  products: HttpTypes.StoreProduct[]
  categories: CategoryTree[]
  activeCategoryHandle: string | null
  facets: SpecFacetDTO[]
  sortable: SpecSortOption[]
  initialQuery?: string
}) {
  const searchParams = useSearchParams()
  const [q, setQ] = useState(initialQuery)
  const query = q.trim().toLowerCase()

  const searched = query
    ? products.filter((p) => {
        const skus = (p.variants ?? []).map((v) => v.sku ?? "").join(" ")
        const hay =
          `${p.title} ${p.subtitle ?? ""} ${(p.metadata?.mpn as string) ?? ""} ${skus}`.toLowerCase()
        return hay.includes(query)
      })
    : products

  const priceRange = parsePriceOverlay(searchParams.get("price"))
  const visibleProducts =
    priceRange.min !== null || priceRange.max !== null
      ? searched.filter((p) => {
          const amount = cheapestCalculatedAmount(p)
          if (amount === null) return false
          if (priceRange.min !== null && amount < priceRange.min) return false
          if (priceRange.max !== null && amount > priceRange.max) return false
          return true
        })
      : searched

  const categoryLinks: CollectionSidebarCategoryLink[] = [
    {
      // Category link hrefs are clean (`?category=<handle>` only) so
      // switching category drops `?specs=`/`?sort=`/`?price=`/`?q=` — those
      // don't necessarily carry over between categories, same as before.
      label: "All Products",
      href: "/products",
      active: !activeCategoryHandle,
    },
    ...categories.map((top) => ({
      label: top.name,
      href: `/products?category=${top.handle}`,
      active: activeCategoryHandle === top.handle,
      children: top.children.length
        ? top.children.map((child) => ({
            label: child.name,
            href: `/products?category=${child.handle}`,
            active: activeCategoryHandle === child.handle,
          }))
        : undefined,
    })),
  ]

  return (
    <div className="athens-container py-10 md:py-14">
      <h1 className="athens-section-heading text-[28px]">All Products</h1>
      <p className="mt-2 text-[15px] text-athens-body">
        Selec PLCs, HMIs, timers, meters and accessories — live stock,
        GST-inclusive pricing, pan-India shipping.
      </p>

      <form
        onSubmit={(e) => e.preventDefault()}
        role="search"
        className="mt-8 max-w-md"
      >
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-athens-body"
          />
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, SKU or model…"
            aria-label="Search products"
            className="h-11 rounded-[5px] border-athens-line pl-10 text-[15px]"
          />
        </div>
        {query ? (
          <p className="mt-2 text-sm text-athens-body">
            {visibleProducts.length} result
            {visibleProducts.length === 1 ? "" : "s"} for &ldquo;{q.trim()}
            &rdquo;
          </p>
        ) : null}
      </form>

      <div className="mt-6 flex flex-col gap-8 lg:flex-row">
        <div className="hidden lg:block">
          <CollectionSidebar
            facets={facets}
            categories={categoryLinks}
            basePath="/products"
          />
        </div>

        <div className="min-w-0 flex-1">
          <CatalogToolbar
            count={visibleProducts.length}
            sortable={sortable}
            filtersSlot={
              <CollectionSidebar
                facets={facets}
                categories={categoryLinks}
                basePath="/products"
              />
            }
            className="mb-5"
          />

          {visibleProducts.length > 0 ? (
            <ProductGrid>
              {visibleProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  quickViewSlot={<QuickViewButton product={product} />}
                  compareSlot={<CompareCardCheckbox productId={product.id} />}
                />
              ))}
            </ProductGrid>
          ) : (
            <p className="text-sm text-athens-body">
              No products matched your filters.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
