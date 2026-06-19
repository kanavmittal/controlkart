"use client"

import { useQuery } from "@tanstack/react-query"
import { sdk, PRODUCT_LIVE_FIELDS } from "@/lib/sdk"
import { queryKeys, DYNAMIC_QUERY_OPTIONS } from "@/lib/query-keys"
import { useRegion } from "./use-region"

export type LiveProduct = {
  priceByVariant: Record<string, number | null>
  stockByVariant: Record<string, number>
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
      const stockByVariant: Record<string, number> = {}
      for (const v of product.variants ?? []) {
        priceByVariant[v.id] = v.calculated_price?.calculated_amount ?? null
        stockByVariant[v.id] = v.inventory_quantity ?? 0
      }
      return { priceByVariant, stockByVariant }
    },
    ...DYNAMIC_QUERY_OPTIONS,
  })

  return {
    priceByVariant: data?.priceByVariant ?? {},
    stockByVariant: data?.stockByVariant ?? {},
    // "waiting for region" counts as loading
    isLoading: isLoading || !regionId,
    isError,
  }
}
