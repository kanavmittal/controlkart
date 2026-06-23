import type { Metadata } from "next"
import { HttpTypes } from "@medusajs/types"
import { listProducts, listProductsInCategories } from "@/lib/data/products"
import {
  flattenDescendants,
  getCategoryByHandle,
  getCategoryTree,
  getCategorySpecFacets,
} from "@/lib/data/categories"
import { parseSpecParam } from "@/lib/specs"
import type { SpecFacetDTO, SpecSortOption } from "@/lib/data/types"
import { ProductsBrowser } from "./products-browser"

export const revalidate = 300

export const metadata: Metadata = {
  title: "All Products - Selec Industrial Automation Components",
  description:
    "Browse Selec PLCs, IO modules, displays and industrial automation accessories. Live stock, GST-inclusive pricing, pan-India shipping.",
  alternates: { canonical: "/products" },
}

type Props = {
  searchParams: Promise<{ category?: string; specs?: string; sort?: string }>
}

export default async function ProductsPage({ searchParams }: Props) {
  const sp = await searchParams
  const selected = parseSpecParam(sp.specs)
  const hasFilters = Object.values(selected).some((v) => v.length > 0)
  const sort = sp.sort

  // Tree (top-level + children) drives the nav; the active category is resolved
  // with its FULL descendant subtree (any depth) so product aggregation matches
  // the backend's mpath-based facet/sort universe.
  const [tree, active] = await Promise.all([
    getCategoryTree(),
    sp.category ? getCategoryByHandle(sp.category) : Promise.resolve(null),
  ])
  const subtreeIds = active
    ? [active.id, ...flattenDescendants(active).map((c) => c.id)]
    : []

  let products: HttpTypes.StoreProduct[]
  let facets: SpecFacetDTO[] = []
  let sortable: SpecSortOption[] = []
  let productIds: string[] = []

  if (active) {
    const [prods, fres] = await Promise.all([
      listProductsInCategories(subtreeIds),
      getCategorySpecFacets(active.id, selected, sort),
    ])
    products = prods
    facets = fres.facets
    sortable = fres.sortable
    productIds = fres.product_ids
  } else {
    products = (await listProducts({ limit: 100 })).products
  }

  const byId = new Map(products.map((p) => [p.id, p]))
  const visibleProducts =
    active && (hasFilters || sort)
      ? productIds
          .map((id) => byId.get(id))
          .filter((p): p is HttpTypes.StoreProduct => p !== undefined)
      : products

  return (
    <div className="shell py-12">
      <header className="border-b border-[var(--color-line)] pb-6">
        <h1 className="text-3xl font-bold tracking-tight">All Products</h1>
        <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
          Selec PLCs, HMIs, timers, meters and accessories — live stock,
          GST-inclusive pricing, pan-India shipping.
        </p>
      </header>
      <ProductsBrowser
        products={visibleProducts}
        categories={tree.map((t) => ({
          id: t.id,
          name: t.name,
          handle: t.handle,
          children: t.children.map((c) => ({
            id: c.id,
            name: c.name,
            handle: c.handle,
          })),
        }))}
        activeCategoryHandle={active?.handle ?? null}
        facets={facets}
        selected={selected}
        sortable={sortable}
        sort={sort}
      />
    </div>
  )
}
