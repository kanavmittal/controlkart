"use client"

import Image from "next/image"
import Link from "next/link"
import { useQueries, useQuery } from "@tanstack/react-query"
import type { HttpTypes } from "@medusajs/types"
import { X } from "lucide-react"

import { sdk, PRODUCT_FIELDS_CLIENT } from "@/lib/sdk"
import { queryKeys } from "@/lib/query-keys"
import { useRegion } from "@/lib/hooks/use-region"
import type { SpecValueDTO } from "@/lib/data/types"
import { Button } from "@/components/ui/button"
import { Price } from "@/components/shared/price"
import { StockPill } from "@/components/shared/stock-pill"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { cn } from "@/lib/utils"
import { useCompare } from "./compare-context"

const MAX_COLUMNS = 5
const LABEL_COLUMN_WIDTH = 200

/** Cheapest calculated price across a product's variants, plus whether it's
 *  a range (mirrors the derivation in `product-card.tsx`). */
function derivePrice(product: HttpTypes.StoreProduct) {
  const priceEntries = (product.variants ?? [])
    .map((variant) => variant.calculated_price)
    .filter(
      (price): price is NonNullable<typeof price> =>
        typeof price?.calculated_amount === "number"
    )
  const cheapest = priceEntries.length
    ? priceEntries.reduce((min, price) =>
        price.calculated_amount! < min.calculated_amount! ? price : min
      )
    : null
  const distinctAmounts = new Set(priceEntries.map((price) => price.calculated_amount))
  const from = (product.variants?.length ?? 0) > 1 && distinctAmounts.size > 1
  return {
    amount: cheapest?.calculated_amount ?? null,
    originalAmount: cheapest?.original_amount ?? null,
    from,
  }
}

/** Aggregated stock across a product's variants (mirrors `product-card.tsx`). */
function deriveStock(product: HttpTypes.StoreProduct) {
  const variants = product.variants ?? []
  const totalStock = variants.reduce(
    (acc, variant) => acc + (variant.inventory_quantity ?? 0),
    0
  )
  const canBackorder = variants.some(
    (variant) => variant.manage_inventory === false || variant.allow_backorder === true
  )
  return { totalStock, canBackorder }
}

/**
 * `/compare` table — client-driven per T25: reads selected ids from
 * `useCompare()` (context + localStorage, no server involvement), fetches
 * the products by id (`sdk.store.product.list`, same `PRODUCT_FIELDS_CLIENT`
 * the home featured grid / quick-order use) and, per product, its specs via
 * the same `/store/products/:id/specs` endpoint `quick-view-dialog.tsx`
 * calls (`queryKeys.productSpecs`) — fetched at the product's default
 * (unselected-variant) specs, since this table compares products, not a
 * single chosen variant.
 *
 * Row alignment: attribute rows are the **union** of every `is_comparable`
 * spec across the selected products, keyed by `attribute_code` (first-seen
 * label/unit win; sort order = the attribute's own `group_order`/
 * `display_order` at first appearance). Each product column looks its value
 * up by that same code and renders "—" when absent — this is what keeps
 * rows aligned across products that don't share an identical spec set.
 */
export function CompareTable() {
  const { ids, remove } = useCompare()
  const { regionId } = useRegion()
  const compareIds = ids.slice(0, MAX_COLUMNS)

  const productsQuery = useQuery({
    queryKey: ["compare-products", compareIds, regionId],
    queryFn: async () => {
      const { products } = await sdk.store.product.list({
        id: compareIds,
        region_id: regionId,
        fields: PRODUCT_FIELDS_CLIENT,
        limit: compareIds.length,
      })
      return products
    },
    enabled: compareIds.length > 0 && !!regionId,
  })

  const specsQueries = useQueries({
    queries: compareIds.map((id) => ({
      queryKey: queryKeys.productSpecs(id),
      queryFn: () =>
        sdk.client.fetch<{ specs: SpecValueDTO[] }>(`/store/products/${id}/specs`),
    })),
  })

  const specsByProductId = new Map<string, SpecValueDTO[]>(
    compareIds.map((id, index) => [id, specsQueries[index]?.data?.specs ?? []])
  )

  const products = productsQuery.data ?? []
  // `id[]` filter order isn't guaranteed by the endpoint — re-sort to match
  // the user's selection order from context.
  const orderedProducts = compareIds
    .map((id) => products.find((product) => product.id === id))
    .filter((product): product is HttpTypes.StoreProduct => Boolean(product))

  const isLoading = productsQuery.isLoading || (compareIds.length > 0 && !regionId)

  if (compareIds.length < 2) {
    return <CompareEmptyState />
  }

  if (isLoading) {
    return (
      <div className="my-16 space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="h-12 w-full animate-pulse rounded bg-[var(--color-athens-band)]"
          />
        ))}
      </div>
    )
  }

  if (orderedProducts.length < 2) {
    return <CompareEmptyState />
  }

  // Union of every `is_comparable` attribute across the visible columns.
  const attributeMap = new Map<string, { attribute: string; unit: string | null; order: number }>()
  orderedProducts.forEach((product) => {
    const specs = specsByProductId.get(product.id) ?? []
    specs
      .filter((spec) => spec.is_comparable)
      .forEach((spec) => {
        if (!attributeMap.has(spec.attribute_code)) {
          attributeMap.set(spec.attribute_code, {
            attribute: spec.attribute,
            unit: spec.unit,
            order: spec.group_order * 1000 + spec.display_order,
          })
        }
      })
  })
  const attributeRows = Array.from(attributeMap.entries()).sort(
    (a, b) => a[1].order - b[1].order
  )

  const columnCount = orderedProducts.length
  const gridTemplateColumns = `${LABEL_COLUMN_WIDTH}px repeat(${columnCount}, minmax(180px, 1fr))`
  const minWidth = LABEL_COLUMN_WIDTH + columnCount * 200

  const rowClass = "grid gap-x-6 border-t border-[var(--color-athens-line)]"
  const labelCellClass =
    "sticky left-0 z-10 bg-white py-[15px] pr-4 text-[15px] font-medium text-[var(--color-athens-dark)]"
  const valueCellClass = "py-[15px] text-[15px] text-[var(--color-athens-body)]"

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth }}>
        {/* Header row: image, title, View CTA, remove */}
        <div className="grid gap-x-6" style={{ gridTemplateColumns }}>
          <div />
          {orderedProducts.map((product) => (
            <div key={product.id} className="relative pb-[15px]">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="absolute top-0 right-0 border-0"
                aria-label={`Remove ${product.title} from compare`}
                onClick={() => remove(product.id)}
              >
                <X />
              </Button>
              <Link href={`/products/${product.handle}`} className="block">
                {product.thumbnail ? (
                  <div className="relative mx-auto mb-4 h-[210px] w-full">
                    <Image
                      src={product.thumbnail}
                      alt={product.title}
                      fill
                      className="object-contain"
                      sizes="220px"
                    />
                  </div>
                ) : (
                  <div className="mb-4 h-[210px] w-full bg-[var(--color-athens-band)]" />
                )}
                <p className="mb-4 text-[15px] leading-[19.5px] text-[var(--color-athens-dark)]">
                  {product.title}
                </p>
              </Link>
              <Button
                variant="outline"
                className="w-full"
                render={<Link href={`/products/${product.handle}`} />}
              >
                View product
              </Button>
            </div>
          ))}
        </div>

        {/* Price */}
        <div className={rowClass} style={{ gridTemplateColumns }}>
          <div className={labelCellClass}>Price</div>
          {orderedProducts.map((product) => {
            const { amount, originalAmount, from } = derivePrice(product)
            return (
              <div key={product.id} className="py-[15px]">
                <Price amount={amount} originalAmount={originalAmount} from={from} taxNote />
              </div>
            )
          })}
        </div>

        {/* Stock */}
        <div className={rowClass} style={{ gridTemplateColumns }}>
          <div className={labelCellClass}>Stock availability</div>
          {orderedProducts.map((product) => {
            const { totalStock, canBackorder } = deriveStock(product)
            return (
              <div key={product.id} className="py-[15px]">
                <StockPill availableQuantity={totalStock} canBackorder={canBackorder} />
              </div>
            )
          })}
        </div>

        {/* Brand */}
        <div className={rowClass} style={{ gridTemplateColumns }}>
          <div className={labelCellClass}>Brand</div>
          {orderedProducts.map((product) => {
            const brand = product.metadata?.brand as string | undefined
            return (
              <div key={product.id} className={valueCellClass}>
                {brand || "—"}
              </div>
            )
          })}
        </div>

        {/* SKU */}
        <div className={rowClass} style={{ gridTemplateColumns }}>
          <div className={labelCellClass}>SKU</div>
          {orderedProducts.map((product) => {
            const sku =
              (product.metadata?.mpn as string | undefined) ||
              product.variants?.[0]?.sku ||
              undefined
            return (
              <div key={product.id} className={cn(valueCellClass, "font-mono")}>
                {sku || "—"}
              </div>
            )
          })}
        </div>

        {/* One row per `is_comparable` attribute, unioned across products */}
        {attributeRows.map(([code, meta]) => (
          <div key={code} className={rowClass} style={{ gridTemplateColumns }}>
            <div className={labelCellClass}>
              {meta.attribute}
              {meta.unit ? ` (${meta.unit})` : ""}
            </div>
            {orderedProducts.map((product) => {
              const specs = specsByProductId.get(product.id) ?? []
              const spec = specs.find((s) => s.attribute_code === code)
              return (
                <div key={product.id} className={valueCellClass}>
                  {spec ? `${spec.value}${spec.unit ? ` ${spec.unit}` : ""}` : "—"}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function CompareEmptyState() {
  return (
    <Empty className="my-16 border border-dashed border-[var(--color-athens-line)]">
      <EmptyHeader>
        <EmptyTitle>Nothing to compare yet</EmptyTitle>
        <EmptyDescription>
          Select at least 2 products from the catalog to see them side by side.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" render={<Link href="/products" />}>
          Browse products
        </Button>
      </EmptyContent>
    </Empty>
  )
}
