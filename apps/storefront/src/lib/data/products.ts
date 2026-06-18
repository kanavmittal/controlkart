import { HttpTypes } from "@medusajs/types"
import { storeFetch } from "../medusa"
import type { SpecValueDTO, ProductDocumentDTO } from "./types"

const PRODUCT_FIELDS =
  "id,title,subtitle,handle,description,thumbnail,metadata,*images,*options,*options.values,*variants,*variants.options,*variants.calculated_price,+variants.inventory_quantity,*categories"

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

export async function quickOrderLookup(skus: string[]) {
  return storeFetch<{
    results: {
      sku: string
      found: boolean
      variant: {
        id: string
        sku: string
        title: string
        product: { id: string; title: string; handle: string; thumbnail: string | null }
      } | null
    }[]
  }>("/store/quick-order", {
    query: { skus: skus.join(",") },
    revalidate: false,
  })
}
