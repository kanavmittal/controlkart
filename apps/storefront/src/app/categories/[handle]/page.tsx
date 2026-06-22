import type { Metadata } from "next"
import { notFound } from "next/navigation"
import {
  getCategoryByHandle,
  getCategorySpecFacets,
  listCategories,
} from "@/lib/data/categories"
import { listProducts } from "@/lib/data/products"
import { ProductCard } from "@/components/products/product-card"
import { SpecFilterSidebar } from "@/components/products/spec-filter-sidebar"

export const revalidate = 300

type Props = {
  params: Promise<{ handle: string }>
  searchParams: Promise<{ specs?: string }>
}

/** Safely parses the `specs` URL param (JSON: { attribute_code: [values] }). */
function parseSelected(raw?: string): Record<string, string[]> {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return {}
    const out: Record<string, string[]> = {}
    for (const [code, vals] of Object.entries(parsed)) {
      if (Array.isArray(vals)) {
        out[code] = vals.filter((v): v is string => typeof v === "string")
      }
    }
    return out
  } catch {
    return {}
  }
}

export async function generateStaticParams() {
  // Resilient: skip prebuilding params if the backend is unreachable at build time.
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
  const category = await getCategoryByHandle(handle)
  if (!category) notFound()

  const selected = parseSelected((await searchParams).specs)
  const hasFilters = Object.values(selected).some((v) => v.length > 0)

  const [{ products }, { facets, product_ids }] = await Promise.all([
    listProducts({ category_id: category.id, limit: 100 }),
    getCategorySpecFacets(category.id, selected),
  ])

  // Facet matching is computed server-side; narrow the rendered grid to the
  // matching ids when filters are active.
  const matched = new Set(product_ids)
  const visibleProducts = hasFilters
    ? products.filter((p) => matched.has(p.id))
    : products
  const count = visibleProducts.length

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "/" },
      { "@type": "ListItem", position: 2, name: "Products", item: "/products" },
      {
        "@type": "ListItem",
        position: 3,
        name: category.name,
        item: `/categories/${handle}`,
      },
    ],
  }

  return (
    <div className="shell py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <nav className="text-xs text-[var(--color-ink-muted)]">
        Home / Products / <span className="text-[var(--color-ink)]">{category.name}</span>
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

      <div className="mt-8 flex flex-col gap-8 lg:flex-row">
        {facets.length > 0 && (
          <SpecFilterSidebar facets={facets} selected={selected} />
        )}

        <div className="flex-1">
          {visibleProducts.length > 0 ? (
            <div className="grid grid-cols-1 gap-px border border-[var(--color-line)] bg-[var(--color-line)] sm:grid-cols-2 lg:grid-cols-3">
              {visibleProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : hasFilters ? (
            <p className="text-sm text-[var(--color-ink-muted)]">
              No products match the selected filters. Try removing some.
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
