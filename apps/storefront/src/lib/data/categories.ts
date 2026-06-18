import { HttpTypes } from "@medusajs/types"
import { storeFetch } from "../medusa"

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
