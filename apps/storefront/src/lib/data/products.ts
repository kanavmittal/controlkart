import { HttpTypes } from "@medusajs/types"
import { storeFetch } from "../medusa"
import type { SpecValueDTO, ProductDocumentDTO } from "./types"

const PRODUCT_FIELDS =
  "id,title,subtitle,handle,description,thumbnail,metadata,*images,*options,*options.values,*variants,*variants.options,*variants.images,*variants.calculated_price,+variants.inventory_quantity,*categories"

export async function listProducts(params: {
  category_id?: string
  q?: string
  limit?: number
  offset?: number
} = {}) {
  const { products, count } = await storeFetch<{
    products: HttpTypes.StoreProduct[]
    count: number
  }>("/store/products", {
    query: {
      fields: PRODUCT_FIELDS,
      region_id: await getRegionId(),
      limit: params.limit ?? 24,
      offset: params.offset ?? 0,
      category_id: params.category_id,
      q: params.q,
    },
    tags: ["products"],
  })
  return { products, count }
}

/** All products in one category, paginating so nothing is dropped by a page cap. */
async function listAllProductsInCategory(
  category_id: string,
  pageSize = 100
): Promise<HttpTypes.StoreProduct[]> {
  const all: HttpTypes.StoreProduct[] = []
  let offset = 0
  // Hard stop guards against an unexpected count/loop (catalogue is small).
  for (let page = 0; page < 50; page++) {
    const { products, count } = await listProducts({
      category_id,
      limit: pageSize,
      offset,
    })
    all.push(...products)
    offset += pageSize
    if (products.length < pageSize || all.length >= count) {
      break
    }
  }
  return all
}

/**
 * Products across several categories (e.g. a parent category plus all its
 * sub-categories), merged and de-duplicated. Products live in leaf categories,
 * so a parent listing aggregates its descendants. A fetch per category avoids
 * array-query-param ambiguity; each is fully paginated so the rendered set is
 * authoritative relative to the backend's facet/sort product ids.
 */
export async function listProductsInCategories(
  categoryIds: string[]
): Promise<HttpTypes.StoreProduct[]> {
  const ids = [...new Set(categoryIds.filter(Boolean))]
  if (!ids.length) {
    return []
  }
  const results = await Promise.all(
    ids.map((category_id) => listAllProductsInCategory(category_id))
  )
  const byId = new Map<string, HttpTypes.StoreProduct>()
  for (const products of results) {
    for (const p of products) {
      byId.set(p.id, p)
    }
  }
  return [...byId.values()]
}

export async function getProductByHandle(handle: string) {
  const { products } = await storeFetch<{
    products: HttpTypes.StoreProduct[]
  }>("/store/products", {
    query: {
      handle,
      fields: PRODUCT_FIELDS,
      region_id: await getRegionId(),
    },
    tags: ["products"],
  })
  return products[0] ?? null
}

export async function getProductSpecs(
  productId: string,
  variantId?: string
): Promise<SpecValueDTO[]> {
  const { specs } = await storeFetch<{ specs: SpecValueDTO[] }>(
    `/store/products/${productId}/specs`,
    { query: { variant_id: variantId }, tags: ["specs"] }
  )
  return specs
}

export async function getProductDocuments(
  productId: string
): Promise<ProductDocumentDTO[]> {
  const { documents } = await storeFetch<{ documents: ProductDocumentDTO[] }>(
    `/store/products/${productId}/documents`,
    { tags: ["documents"] }
  )
  return documents
}

let cachedRegionId: string | undefined

export async function getRegionId(): Promise<string | undefined> {
  if (cachedRegionId) return cachedRegionId
  const { regions } = await storeFetch<{ regions: HttpTypes.StoreRegion[] }>(
    "/store/regions",
    { revalidate: 3600 }
  )
  cachedRegionId = regions.find((r) =>
    r.countries?.some((c) => c.iso_2 === "in")
  )?.id ?? regions[0]?.id
  return cachedRegionId
}
