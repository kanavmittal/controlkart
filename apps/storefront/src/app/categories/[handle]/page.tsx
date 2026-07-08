import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  flattenDescendants,
  getCategoryByHandle,
  getCategorySpecFacets,
  listCategories,
} from "@/lib/data/categories"
import { listProductsInCategories } from "@/lib/data/products"
import { ProductCard } from "@/components/products/product-card"
import { ProductGrid } from "@/components/products/product-grid"
import { SpecFilterSidebar } from "@/components/products/spec-filter-sidebar"
import { SpecSortDropdown } from "@/components/products/spec-sort-dropdown"
import { Breadcrumbs } from "@/components/shared/breadcrumbs"
import { parseSpecParam } from "@/lib/specs"
import { cn } from "@/lib/utils"

export const revalidate = 300

type Props = {
  params: Promise<{ handle: string }>
  searchParams: Promise<{ specs?: string; sort?: string }>
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

      <div className="shell mt-8 flex flex-col gap-8 py-12 lg:flex-row">
        {facets.length > 0 && (
          <SpecFilterSidebar facets={facets} selected={selected} />
        )}

        <div className="flex-1">
          {sortable.length > 0 && (
            <div className="mb-4 flex justify-end">
              <SpecSortDropdown sortable={sortable} value={sort} />
            </div>
          )}

          {visibleProducts.length > 0 ? (
            <ProductGrid cols={3}>
              {visibleProducts.map(
                (product) =>
                  product && (
                    <ProductCard key={product.id} product={product} />
                  )
              )}
            </ProductGrid>
          ) : hasFilters ? (
            <p className="text-sm text-[var(--color-ink-muted)]">
              No products match the selected filters. Try removing some.
            </p>
          ) : children.length > 0 ? (
            <p className="text-sm text-[var(--color-ink-muted)]">
              Pick a sub-category above to browse products.
            </p>
          ) : (
            <p className="text-sm text-[var(--color-ink-muted)]">
              Products in this category are coming soon.{" "}
              <a
                href="/request-quote"
                className="text-[var(--color-accent)] underline"
              >
                Request a quote
              </a>{" "}
              if you need something specific.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
