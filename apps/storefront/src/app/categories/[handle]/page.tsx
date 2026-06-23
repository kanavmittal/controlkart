import type { Metadata } from "next"
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
import { SpecFilterSidebar } from "@/components/products/spec-filter-sidebar"
import { SpecSortDropdown } from "@/components/products/spec-sort-dropdown"
import { parseSpecParam } from "@/lib/specs"

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

  return (
    <div className="shell py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <nav className="flex flex-wrap gap-1 text-xs text-[var(--color-ink-muted)]">
        <Link href="/" className="hover:text-[var(--color-ink)]">
          Home
        </Link>
        <span>/</span>
        <Link href="/products" className="hover:text-[var(--color-ink)]">
          Products
        </Link>
        {parent && (
          <>
            <span>/</span>
            <Link
              href={`/categories/${parent.handle}`}
              className="hover:text-[var(--color-ink)]"
            >
              {parent.name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-[var(--color-ink)]">{category.name}</span>
      </nav>

      <header className="mt-4 border-b border-[var(--color-line)] pb-6">
        <h1 className="text-3xl font-bold tracking-tight">{category.name}</h1>
        {category.description && (
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--color-ink-muted)]">
            {category.description}
          </p>
        )}
        <p className="mt-2 text-xs text-[var(--color-ink-faint)]">
          {count} product{count === 1 ? "" : "s"}
          {hasFilters ? " match your filters" : ""} · Prices inclusive of GST
        </p>
      </header>

      {children.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
            Shop by sub-category
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-px border border-[var(--color-line)] bg-[var(--color-line)] sm:grid-cols-3 lg:grid-cols-4">
            {children.map((child) => (
              <Link
                key={child.id}
                href={`/categories/${child.handle}`}
                className="group bg-[var(--color-surface)] p-4 hover:bg-[var(--color-surface-alt)]"
              >
                <h3 className="text-sm font-medium group-hover:text-[var(--color-accent)]">
                  {child.name}
                </h3>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mt-8 flex flex-col gap-8 lg:flex-row">
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
            <div className="grid grid-cols-1 gap-px border border-[var(--color-line)] bg-[var(--color-line)] sm:grid-cols-2 lg:grid-cols-3">
              {visibleProducts.map(
                (product) =>
                  product && (
                    <ProductCard key={product.id} product={product} />
                  )
              )}
            </div>
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
