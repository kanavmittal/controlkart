"use client"

import { useQuery } from "@tanstack/react-query"
import { sdk, PRODUCT_FIELDS_CLIENT } from "@/lib/sdk"
import { queryKeys } from "@/lib/query-keys"
import { useRegion } from "@/lib/hooks/use-region"
import { ProductCard } from "@/components/products/product-card"

/** Below-the-fold CSR: featured products grid (fresh price/stock). */
export function HomeFeaturedProducts() {
  const { regionId } = useRegion()
  const { data: products = [], isLoading } = useQuery({
    queryKey: queryKeys.homeFeatured(regionId),
    enabled: !!regionId,
    queryFn: async () => {
      const { products } = await sdk.store.product.list({
        limit: 8,
        region_id: regionId,
        fields: PRODUCT_FIELDS_CLIENT,
      })
      return products
    },
  })

  const loading = isLoading || !regionId

  return (
    <div className="mt-8 grid grid-cols-1 gap-px border border-[var(--color-line)] bg-[var(--color-line)] sm:grid-cols-2 lg:grid-cols-4">
      {loading
        ? Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col bg-[var(--color-surface)]">
              <div className="aspect-square animate-pulse bg-[var(--color-surface-alt)]" />
              <div className="space-y-2 p-4">
                <div className="h-3 w-16 animate-pulse rounded bg-[var(--color-surface-alt)]" />
                <div className="h-4 w-full animate-pulse rounded bg-[var(--color-surface-alt)]" />
                <div className="h-5 w-20 animate-pulse rounded bg-[var(--color-surface-alt)]" />
              </div>
            </div>
          ))
        : products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
    </div>
  )
}
