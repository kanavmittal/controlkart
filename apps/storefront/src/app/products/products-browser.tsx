"use client"

import { useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useQuery, keepPreviousData } from "@tanstack/react-query"
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
import { searchProducts } from "@/lib/data/search"
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value"
import type { SpecFacetDTO, SpecSortOption } from "@/lib/data/types"

type Cat = { id: string; name: string; handle: string }
type CategoryTree = Cat & { children: Cat[] }

const SEARCH_DEBOUNCE_MS = 300

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

/** Same substring scan the free-text search used before Meilisearch —
 *  kept as the degraded-mode fallback (see `searched` below) and as the
 *  instant local path when a vendor is selected with no typed query. */
function localTextMatch(product: HttpTypes.StoreProduct, query: string): boolean {
  const skus = (product.variants ?? []).map((v) => v.sku ?? "").join(" ")
  const hay =
    `${product.title} ${product.subtitle ?? ""} ${(product.metadata?.mpn as string) ?? ""} ${skus}`.toLowerCase()
  return hay.includes(query)
}

function matchesVendor(product: HttpTypes.StoreProduct, vendor: string): boolean {
  return product.metadata?.brand === vendor
}

/**
 * Client-side catalogue browser. Category (hierarchical), spec-facet
 * filtering and spec sort are URL-driven (server-rendered, shareable) and
 * stay completely untouched by the logic below — Meilisearch only ranks or
 * narrows *within* the already-resolved `products` set, never expands
 * outside it (any hit id absent from `products` is silently dropped).
 *
 * Free-text search (seeded from `?q=` for a correct first paint) is
 * three-way:
 *  - no query, no vendor: `products` as-is (today's behavior, unchanged).
 *  - no query, vendor selected: instant local filter by
 *    `metadata.brand === vendor` — no network call, since the full
 *    candidate set is already in hand client-side.
 *  - query present: debounced Meilisearch call via `searchProducts()`,
 *    scoped by `categoryIds`/`vendor`, intersected against `products`.
 *    `placeholderData: keepPreviousData` keeps the previous result set
 *    visible between keystrokes instead of flashing the full/empty grid.
 *    On a degraded response or a query error, falls back to the local
 *    substring scan rather than showing an empty grid.
 *
 * A NEW `?price=<min>-<max>` overlay (read directly off the URL here) is
 * intersected against the result afterwards. Selecting a parent category
 * aggregates its sub-categories' products.
 */
export function ProductsBrowser({
  products,
  categories,
  activeCategoryHandle,
  facets,
  sortable,
  initialQuery = "",
  categoryIds,
  vendor,
}: {
  products: HttpTypes.StoreProduct[]
  categories: CategoryTree[]
  activeCategoryHandle: string | null
  facets: SpecFacetDTO[]
  sortable: SpecSortOption[]
  initialQuery?: string
  categoryIds: string[]
  vendor?: string
}) {
  const searchParams = useSearchParams()
  const [q, setQ] = useState(initialQuery)
  const query = q.trim().toLowerCase()
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS)

  const byId = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  )

  const searchEnabled = debouncedQuery.length > 0
  const {
    data: searchResult,
    isError: searchErrored,
  } = useQuery({
    // `categoryIds` is a fresh array each render, but React Query hashes
    // query keys by content (not reference), so this doesn't cause spurious
    // cache misses/refetches.
    queryKey: ["products-search", debouncedQuery, categoryIds, vendor],
    enabled: searchEnabled,
    queryFn: () =>
      searchProducts({
        q: debouncedQuery,
        categoryIds,
        vendor,
        limit: 100,
      }),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  })

  const searched = useMemo(() => {
    if (!query) {
      return vendor ? products.filter((p) => matchesVendor(p, vendor)) : products
    }
    // Local-scan fallback (degraded/errored/not-yet-fetched, see branches
    // below) must still respect an active vendor selection — the live
    // Meilisearch path scopes by `vendor` server-side, so the fallback has
    // to intersect it locally too, or a brand filter would silently leak
    // other brands' products whenever search degrades.
    const localFallback = () =>
      products.filter(
        (p) => localTextMatch(p, query) && (!vendor || matchesVendor(p, vendor))
      )
    // Degraded (Meilisearch unconfigured/unreachable) or a network error —
    // never worse than the pre-Meilisearch behavior.
    if (searchErrored || searchResult?.degraded) {
      return localFallback()
    }
    // In flight for a brand-new debounced value with no `placeholderData`
    // yet (e.g. the very first search of this session) — `searchResult` is
    // still undefined; fall back to the local scan rather than an empty
    // flash, `keepPreviousData` covers every subsequent keystroke.
    if (!searchResult) {
      return localFallback()
    }
    return searchResult.hits
      .map((hit) => byId.get(hit.id))
      .filter((p): p is HttpTypes.StoreProduct => p !== undefined)
  }, [query, vendor, products, searchErrored, searchResult, byId])

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
    ...categories.map((top) => {
      const childActive = top.children.some(
        (c) => c.handle === activeCategoryHandle
      )
      return {
        label: top.name,
        href: `/products?category=${top.handle}`,
        active: activeCategoryHandle === top.handle,
        defaultExpanded: activeCategoryHandle === top.handle || childActive,
        children: top.children.length
          ? top.children.map((child) => ({
              label: child.name,
              href: `/products?category=${child.handle}`,
              active: activeCategoryHandle === child.handle,
            }))
          : undefined,
      }
    }),
  ]

  return (
    <div className="athens-container py-10 md:py-14">
      <h1 className="athens-page-title">All Products</h1>
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
