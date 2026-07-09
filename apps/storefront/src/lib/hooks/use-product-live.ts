"use client"

import { useQuery } from "@tanstack/react-query"
import { sdk, PRODUCT_LIVE_FIELDS } from "@/lib/sdk"
import { queryKeys, DYNAMIC_QUERY_OPTIONS } from "@/lib/query-keys"
import { useRegion } from "./use-region"

export type LiveProduct = {
  priceByVariant: Record<string, number | null>
  /** Live `calculated_price.original_amount` per variant (pre-sale/list
   *  price), so a sale price fetched live never gets paired with a stale
   *  ISR-baked original price. `null` when the variant has no distinct
   *  original price (not on sale) or the field is missing. */
  originalPriceByVariant: Record<string, number | null>
  stockByVariant: Record<string, number>
  /** Whether each variant can be purchased now (managed stock, non-tracked, or backorder). */
  purchasableByVariant: Record<string, boolean>
  isLoading: boolean
  isError: boolean
}

/**
 * Live price + stock for one product, fetched in the browser (uncached,
 * staleTime 0) so the PDP shows real-time values instead of ISR-baked ones.
 * Waits for the region before firing so prices are region-correct.
 */
export function useProductLive(productId: string): LiveProduct {
  const { regionId } = useRegion()

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.productLive(productId, regionId),
    enabled: !!regionId,
    queryFn: async () => {
      const { product } = await sdk.store.product.retrieve(productId, {
        region_id: regionId,
        fields: PRODUCT_LIVE_FIELDS,
      })
      const priceByVariant: Record<string, number | null> = {}
      const originalPriceByVariant: Record<string, number | null> = {}
      const stockByVariant: Record<string, number> = {}
      const purchasableByVariant: Record<string, boolean> = {}
      for (const v of product.variants ?? []) {
        priceByVariant[v.id] = v.calculated_price?.calculated_amount ?? null
        originalPriceByVariant[v.id] = v.calculated_price?.original_amount ?? null
        const qty = v.inventory_quantity ?? 0
        stockByVariant[v.id] = qty
        // Purchasable if inventory isn't tracked, backorders are allowed, or in stock.
        purchasableByVariant[v.id] =
          v.manage_inventory === false || v.allow_backorder === true || qty > 0
      }
      return { priceByVariant, originalPriceByVariant, stockByVariant, purchasableByVariant }
    },
    ...DYNAMIC_QUERY_OPTIONS,
  })

  return {
    priceByVariant: data?.priceByVariant ?? {},
    originalPriceByVariant: data?.originalPriceByVariant ?? {},
    stockByVariant: data?.stockByVariant ?? {},
    purchasableByVariant: data?.purchasableByVariant ?? {},
    // "waiting for region" counts as loading
    isLoading: isLoading || !regionId,
    isError,
  }
}
