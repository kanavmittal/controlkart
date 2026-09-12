import { storeFetch } from "../medusa"
import { listProducts } from "./products"

/** Curated with the standard Medusa Admin collection editor. */
export async function listFeaturedProducts() {
  const { collections } = await storeFetch<{ collections: { id: string }[] }>("/store/collections", {
    query: { handle: "homepage-featured", limit: 1 },
    revalidate: 60,
    tags: ["products", "collections"],
  })
  if (!collections.length) return []
  const { products } = await listProducts({ collection_id: collections[0].id, limit: 8 })
  return products
}
