import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { HttpTypes } from "@medusajs/types"
import { ChevronRight, Filter, LayoutGrid, PackageSearch } from "lucide-react"
import {
  flattenDescendants,
  getCategoryByHandle,
  getCategorySpecFacets,
  listCategories,
} from "@/lib/data/categories"
import { listProductsInCategories } from "@/lib/data/products"
import { ProductCard } from "@/components/product/product-card"
import { ProductGrid } from "@/components/product/product-grid"
import {
  CollectionSidebar,
  type CollectionSidebarCategoryLink,
} from "@/components/product/collection-sidebar"
import { CatalogToolbar } from "@/components/product/catalog-toolbar"
import { QuickViewButton } from "@/components/product/quick-view-button"
import { CompareCardCheckbox } from "@/components/product/compare-card-checkbox"
import { Breadcrumbs } from "@/components/shared/breadcrumbs"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { parseSpecParam } from "@/lib/specs"
import { cn } from "@/lib/utils"

export const revalidate = 300

const PAGE_SIZE = 24

type Props = {
  params: Promise<{ handle: string }>
  searchParams: Promise<{
    specs?: string
    sort?: string
    /** NEW (T20) — 1-based page number, page size 24. */
    page?: string
    /** NEW (T18/T20) — client-side price overlay, `<min>-<max>`, either half
     *  optional. Not part of the `/spec-facets` contract; applied here by
     *  filtering the already-ordered visible list before pagination. */
    price?: string
  }>
}

/** `min-max` — both halves optional, e.g. `"-4999"` or `"500-"`. Mirrors
 *  `CollectionSidebar`'s own (client-side) parser for the same param. */
function parsePriceRange(raw?: string): { min: number | null; max: number | null } {
  if (!raw) {
    return { min: null, max: null }
  }
  const [minRaw = "", maxRaw = ""] = raw.split("-")
  const min = minRaw.trim() === "" ? NaN : Number(minRaw)
  const max = maxRaw.trim() === "" ? NaN : Number(maxRaw)
  return {
    min: Number.isFinite(min) ? min : null,
    max: Number.isFinite(max) ? max : null,
  }
}

/** Cheapest calculated price across a product's variants (major units,
 *  matches `Price`/`ProductCard`'s own derivation). `null` when no variant
 *  has a resolvable calculated price. */
function getCheapestAmount(product: HttpTypes.StoreProduct): number | null {
  const amounts = (product.variants ?? [])
    .map((variant) => variant.calculated_price?.calculated_amount)
    .filter((amount): amount is number => typeof amount === "number")
  return amounts.length ? Math.min(...amounts) : null
}

/** Windowed page-number list for the pagination bar: all pages when few,
 *  otherwise first/last + a neighborhood around the current page with
 *  ellipses filling the gaps. */
function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const keep = new Set(
    [1, 2, total - 1, total, current - 1, current, current + 1].filter(
      (p) => p >= 1 && p <= total
    )
  )
  const sorted = [...keep].sort((a, b) => a - b)
  const out: (number | "ellipsis")[] = []
  let prev = 0
  for (const p of sorted) {
    if (p - prev > 1) out.push("ellipsis")
    out.push(p)
    prev = p
  }
  return out
}

/** Inline promo tile spliced into the grid at index 7 on page 1 only. No
 *  suitable entry in `config/home.ts`'s `promoTiles` (those are all live
 *  category promos with imagery); this is a self-contained tasteful tile. */
function BulkPricingPromoTile() {
  return (
    <Link
      href="/request-quote"
      className={cn(
        "group flex h-full flex-col items-center justify-center gap-2 rounded-[var(--radius)] border border-dashed border-[var(--color-athens-line)] bg-[var(--color-athens-band)] p-6 text-center transition-colors",
        "hover:border-[var(--color-athens-blue)]"
      )}
    >
      <span className="text-[15px] font-medium text-[var(--color-athens-dark)]">
        Need bulk pricing?
      </span>
      <p className="text-[13px] leading-5 text-[var(--color-athens-body)]">
        Request a quote for volume or project orders — our team responds with
        pricing and lead times.
      </p>
      <span className="mt-1 inline-flex items-center gap-1 text-[13px] font-medium text-[var(--color-accent)] group-hover:underline">
        Request a quote
        <ChevronRight className="size-3.5" aria-hidden />
      </span>
    </Link>
  )
}

export async function generateStaticParams() {
  try {
    const categories = await listCategories()
    return categories.map((c) => ({ handle: c.handle }))
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params
  const category = await getCategoryByHandle(handle)
  if (!category) return { title: "Category Not Found" }
  return {
    title: `${category.name} - Buy Selec ${category.name} Online in India`,
    description:
      category.description ||
      `Buy genuine Selec ${category.name} with GST invoice and pan-India shipping from ControlKart.`,
    alternates: { canonical: `/categories/${handle}` },
  }
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { handle } = await params
  const sp = await searchParams
  const category = await getCategoryByHandle(handle)
  if (!category) notFound()

  const parent = category.parent_category
  const children = category.category_children ?? []

  const selected = parseSpecParam(sp.specs)
  const hasFilters = Object.values(selected).some((v) => v.length > 0)
  const sort = sp.sort

  // Products live in leaf sub-categories, so a parent listing aggregates its
  // whole subtree. Facets/sort are resolved server-side (descendants + lineage).
  const descendantIds = [
    category.id,
    ...flattenDescendants(category).map((c) => c.id),
  ]

  const [products, facetsRes] = await Promise.all([
    listProductsInCategories(descendantIds),
    getCategorySpecFacets(category.id, selected, sort),
  ])
  // Tolerate an older backend that doesn't yet return these (deploy window).
  const facets = facetsRes.facets ?? []
  const product_ids = facetsRes.product_ids ?? []
  const sortable = facetsRes.sortable ?? []

  // When a filter or sort is active, `product_ids` is the authoritative
  // (filtered + ordered) list; otherwise show everything in default order.
  const byId = new Map(products.map((p) => [p.id, p]))
  const visibleProducts =
    hasFilters || sort
      ? product_ids.map((id) => byId.get(id)).filter((p) => p !== undefined)
      : products
  const count = visibleProducts.length

  // --- price overlay (NEW, T18/T20) — intersects the already-ordered
  // `visibleProducts` by cheapest calculated price. Applied here, after the
  // specs/sort derivation above and before pagination slicing below.
  const priceRange = parsePriceRange(sp.price)
  const hasPriceFilter = priceRange.min !== null || priceRange.max !== null
  const filteredProducts = hasPriceFilter
    ? visibleProducts.filter((product) => {
        if (!product) return false
        const amount = getCheapestAmount(product)
        if (amount === null) return false
        if (priceRange.min !== null && amount < priceRange.min) return false
        if (priceRange.max !== null && amount > priceRange.max) return false
        return true
      })
    : visibleProducts
  const hasActiveFilters = hasFilters || hasPriceFilter

  // --- pagination (NEW, T20) — slices the FINAL ordered/filtered list.
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE))
  const requestedPage = Number(sp.page)
  const currentPage =
    Number.isFinite(requestedPage) && requestedPage > 0
      ? Math.min(Math.trunc(requestedPage), totalPages)
      : 1
  const pageStart = (currentPage - 1) * PAGE_SIZE
  const pagedProducts = filteredProducts.slice(pageStart, pageStart + PAGE_SIZE)

  const buildPageHref = (page: number) => {
    const qs = new URLSearchParams()
    if (sp.specs) qs.set("specs", sp.specs)
    if (sp.sort) qs.set("sort", sp.sort)
    if (sp.price) qs.set("price", sp.price)
    if (page > 1) qs.set("page", String(page))
    const query = qs.toString()
    return query ? `/categories/${handle}?${query}` : `/categories/${handle}`
  }

  const categoryLinks: CollectionSidebarCategoryLink[] = children.map((child) => ({
    label: child.name,
    href: `/categories/${child.handle}`,
  }))
  const hasSidebarContent = facets.length > 0 || categoryLinks.length > 0

  const crumbs = [
    { name: "Home", item: "/" },
    { name: "Products", item: "/products" },
    ...(parent
      ? [{ name: parent.name, item: `/categories/${parent.handle}` }]
      : []),
    { name: category.name, item: `/categories/${handle}` },
  ]
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: c.item,
    })),
  }

  // Visual crumb chain: Home -> parent (if the fetched category has one, via
  // `parent_category` — one level deep is all `getCategoryByHandle` fetches)
  // -> current. Kept independent of the JSON-LD chain above, which stays
  // byte-identical to what it always emitted.
  const visualCrumbs = [
    ...(parent
      ? [{ label: parent.name, href: `/categories/${parent.handle}` }]
      : []),
    { label: category.name },
  ]

  const heroImage =
    typeof category.metadata?.image === "string"
      ? category.metadata.image
      : undefined

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <Breadcrumbs crumbs={visualCrumbs} />

      <div className="athens-container pt-6">
        <section className="relative h-[180px] overflow-hidden rounded-[5px] bg-[var(--color-athens-dark)]">
          {heroImage ? (
            <>
              <Image
                src={heroImage}
                alt={category.name}
                fill
                priority
                sizes="1420px"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.65)_0%,rgba(0,0,0,0.15)_70%)]" />
            </>
          ) : (
            <div className="absolute inset-0 bg-[var(--color-athens-band)]" />
          )}
          <div className="absolute left-0 top-0 h-2 w-[42px] bg-[var(--color-athens-blue)]" />
          <div className="relative z-10 flex h-full max-w-[620px] flex-col justify-center px-9">
            <h1
              className={cn(
                "text-[28px] font-medium leading-[1.3]",
                heroImage ? "text-white" : "text-[var(--color-athens-dark)]"
              )}
            >
              {category.name}
            </h1>
            {category.description && (
              <p
                className={cn(
                  "mt-1 text-[15px] leading-6",
                  heroImage ? "text-white/90" : "text-[var(--color-athens-body)]"
                )}
              >
                {category.description}
              </p>
            )}
            <p
              className={cn(
                "mt-2 text-xs",
                heroImage ? "text-white/70" : "text-[var(--color-athens-body)]"
              )}
            >
              {count} product{count === 1 ? "" : "s"}
              {hasFilters ? " match your filters" : ""} · Prices inclusive of
              GST
            </p>
          </div>
        </section>

        {children.length > 0 && (
          <section className="mt-[30px]">
            <h2 className="sr-only">Shop by sub-category</h2>
            <div className="flex gap-5 overflow-x-auto athens-no-scrollbar">
              {children.map((child) => (
                <Link
                  key={child.id}
                  href={`/categories/${child.handle}`}
                  className="group w-[152px] shrink-0"
                >
                  {/* category_children are fetched with id/name/handle only
                      (see CATEGORY_TREE_FIELDS) — no per-child image, so the
                      card art is a neutral athens-band placeholder. */}
                  <span className="block h-[69px] overflow-hidden rounded-[5px] bg-[var(--color-athens-band)] shadow-[inset_0_0_0_1px_var(--color-athens-line)]" />
                  <span className="mt-2 block truncate text-center text-[14px] text-[var(--color-athens-body)] group-hover:text-[var(--color-athens-dark)] group-hover:underline">
                    {child.name}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="athens-container mt-8 flex flex-col gap-8 py-12 lg:flex-row">
        {hasSidebarContent && (
          <div className="hidden shrink-0 lg:block">
            <CollectionSidebar
              facets={facets}
              categories={categoryLinks}
              basePath={`/categories/${handle}`}
            />
          </div>
        )}

        <div className="flex-1">
          <CatalogToolbar
            count={filteredProducts.length}
            sortable={sortable}
            filtersSlot={
              hasSidebarContent ? (
                <CollectionSidebar
                  facets={facets}
                  categories={categoryLinks}
                  basePath={`/categories/${handle}`}
                />
              ) : undefined
            }
          />

          {pagedProducts.length > 0 ? (
            <ProductGrid
              className="mt-6"
              columns={3}
              promoTile={
                currentPage === 1
                  ? { node: <BulkPricingPromoTile />, index: 7 }
                  : undefined
              }
            >
              {pagedProducts.map(
                (product) =>
                  product && (
                    <ProductCard
                      key={product.id}
                      product={product}
                      quickViewSlot={<QuickViewButton product={product} />}
                      compareSlot={<CompareCardCheckbox productId={product.id} />}
                    />
                  )
              )}
            </ProductGrid>
          ) : hasActiveFilters ? (
            <Empty className="mt-6 border border-dashed border-[var(--color-athens-line)]">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Filter />
                </EmptyMedia>
                <EmptyTitle>No products match the selected filters</EmptyTitle>
                <EmptyDescription>Try removing some.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : children.length > 0 ? (
            <Empty className="mt-6 border border-dashed border-[var(--color-athens-line)]">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <LayoutGrid />
                </EmptyMedia>
                <EmptyTitle>Pick a sub-category to browse products</EmptyTitle>
                <EmptyDescription>
                  Use the sub-category list above to narrow your search.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Empty className="mt-6 border border-dashed border-[var(--color-athens-line)]">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <PackageSearch />
                </EmptyMedia>
                <EmptyTitle>Products in this category are coming soon</EmptyTitle>
                <EmptyDescription>
                  If you need something specific,{" "}
                  <a href="/request-quote">request a quote</a> and our team
                  will help.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}

          {totalPages > 1 && (
            <Pagination className="mt-10">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href={buildPageHref(Math.max(1, currentPage - 1))}
                    aria-disabled={currentPage === 1}
                    className={cn(
                      currentPage === 1 && "pointer-events-none opacity-50"
                    )}
                  />
                </PaginationItem>
                {getPageNumbers(currentPage, totalPages).map((page, index) =>
                  page === "ellipsis" ? (
                    <PaginationItem key={`ellipsis-${index}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={page}>
                      <PaginationLink
                        href={buildPageHref(page)}
                        isActive={page === currentPage}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}
                <PaginationItem>
                  <PaginationNext
                    href={buildPageHref(Math.min(totalPages, currentPage + 1))}
                    aria-disabled={currentPage === totalPages}
                    className={cn(
                      currentPage === totalPages &&
                        "pointer-events-none opacity-50"
                    )}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </div>
    </div>
  )
}
