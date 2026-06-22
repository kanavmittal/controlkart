import { HttpTypes } from "@medusajs/types"
import { storeFetch } from "../medusa"
import type { SpecFacetsResponse } from "./types"

export async function listCategories() {
  const { product_categories } = await storeFetch<{
    product_categories: HttpTypes.StoreProductCategory[]
  }>("/store/product-categories", {
    query: { fields: "id,name,handle,description", limit: 50 },
    revalidate: 300,
    tags: ["categories"],
  })
  return product_categories
}

export async function getCategoryByHandle(handle: string) {
  const { product_categories } = await storeFetch<{
    product_categories: HttpTypes.StoreProductCategory[]
  }>("/store/product-categories", {
    query: { handle, fields: "id,name,handle,description" },
    revalidate: 300,
    tags: ["categories"],
  })
  return product_categories[0] ?? null
}

/**
 * Spec facets for a category and the product ids matching the selected filters.
 * `selected` maps an attribute code to the chosen exact values; it's sent as a
 * JSON-encoded `filters` query param.
 */
export async function getCategorySpecFacets(
  categoryId: string,
  selected: Record<string, string[]> = {}
): Promise<SpecFacetsResponse> {
  return storeFetch<SpecFacetsResponse>(
    `/store/categories/${categoryId}/spec-facets`,
    {
      query: { filters: JSON.stringify(selected) },
      tags: ["products", "specs"],
    }
  )
}
