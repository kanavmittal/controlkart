import { sdk } from "@/lib/sdk"

export type SearchHit = {
  id: string
  title: string
  handle: string
  thumbnail: string | null
  vendor: string | null
  price: { amount: number; currency_code: string } | null
  categories: { id: string; name: string }[]
}

export type SearchProductsResult = {
  hits: SearchHit[]
  /** True when the backend's Meilisearch index is unconfigured/unreachable
   *  — callers should fall back to their own degraded-mode behavior (e.g.
   *  a local text scan) rather than treating `hits: []` as "no matches". */
  degraded: boolean
}

/** Client-side call to the custom `/store/search` route (Meilisearch-backed
 *  typo-tolerant/faceted product search) — used by both the header
 *  predictive-search dropdown and the `/products` listing page's free-text
 *  box. `sdk.client.fetch` drops `undefined` query values, so omitted
 *  optional params never reach the URL. */
export async function searchProducts(params: {
  q: string
  categoryIds?: string[]
  vendor?: string
  limit?: number
}): Promise<SearchProductsResult> {
  return sdk.client.fetch<SearchProductsResult>("/store/search", {
    query: {
      q: params.q,
      category_ids: params.categoryIds?.length
        ? params.categoryIds.join(",")
        : undefined,
      vendor: params.vendor,
      limit: params.limit,
    },
  })
}
