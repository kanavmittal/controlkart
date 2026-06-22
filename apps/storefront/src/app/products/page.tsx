import type { Metadata } from "next"
import { HttpTypes } from "@medusajs/types"
import { listProducts } from "@/lib/data/products"
import { listCategories, getCategorySpecFacets } from "@/lib/data/categories"
import { parseSpecParam } from "@/lib/specs"
import type { SpecFacetDTO } from "@/lib/data/types"
import { ProductsBrowser } from "./products-browser"

export const revalidate = 300

export const metadata: Metadata = {
  title: "All Products - Selec Industrial Automation Components",
  description:
    "Browse Selec PLCs, IO modules, displays and industrial automation accessories. Live stock, GST-inclusive pricing, pan-India shipping.",
  alternates: { canonical: "/products" },
}

type Props = {
  searchParams: Promise<{ category?: string; specs?: string }>
}

export default async function ProductsPage({ searchParams }: Props) {
  const sp = await searchParams
  const selected = parseSpecParam(sp.specs)
  const hasFilters = Object.values(selected).some((v) => v.length > 0)

  const categories = await listCategories()
  const activeCategory = sp.category
    ? categories.find((c) => c.handle === sp.category) ?? null
    : null

  // Without a category we show the whole catalogue; with one we scope to it and
  // load that category's spec facets (facets are category-specific).
  let products: HttpTypes.StoreProduct[]
  let facets: SpecFacetDTO[] = []
  let matched: Set<string> | null = null

  if (activeCategory) {
    const [prodRes, facetRes] = await Promise.all([
      listProducts({ category_id: activeCategory.id, limit: 100 }),
      getCategorySpecFacets(activeCategory.id, selected),
    ])
    products = prodRes.products
    facets = facetRes.facets
    matched = new Set(facetRes.product_ids)
  } else {
    products = (await listProducts({ limit: 100 })).products
  }

  const visibleProducts =
    activeCategory && hasFilters
      ? products.filter((p) => matched!.has(p.id))
      : products

  return (
    <div className="shell py-12">
      <header className="border-b border-[var(--color-line)] pb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          {activeCategory ? activeCategory.name : "All Products"}
        </h1>
        <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
          Selec PLCs, HMIs, timers, meters and accessories — live stock,
          GST-inclusive pricing, pan-India shipping.
        </p>
      </header>
      <ProductsBrowser
        products={visibleProducts}
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          handle: c.handle,
        }))}
        activeCategoryHandle={activeCategory?.handle ?? null}
        facets={facets}
        selected={selected}
      />
    </div>
  )
}
