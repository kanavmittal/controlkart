/**
 * Home ProductComparison (T51) — clone ref: my-clone
 * `src/components/ProductComparison.tsx` (5-col comparison table: header row
 * image/title/View CTA, then Price/Stock/Vendor/SKU/spec rows).
 *
 * Server-compatible presentational section — distinct from the client
 * `/compare` page (`product/compare-table.tsx`, T25), which reads selection
 * state from `useCompare()` (context + localStorage) and fetches products/
 * specs itself via react-query. This component takes fully-resolved data as
 * props instead: T57 (home assembly) resolves `config/home.ts`
 * `homeComparisonHandles` to live `HttpTypes.StoreProduct[]` (same
 * "config holds handles, component takes live data" split as every other
 * product-bearing home section, e.g. `featured-collection.tsx`) and fetches
 * each product's specs via `getProductSpecs` (`lib/data/products.ts`,
 * server-only), passing both down. No data fetching, hooks, or client state
 * live here, so no "use client" boundary is needed.
 *
 * Union mechanism (kept consistent with `compare-table.tsx` but re-derived
 * locally rather than imported — this component must stay dependency-free/
 * presentational and not pull in the client compare context/query
 * machinery): attribute rows are the union of every `is_comparable` spec
 * across the passed products, keyed by `attribute_code` (first-seen
 * label/unit win; sort order = the attribute's own
 * `group_order * 1000 + display_order` at first appearance). Each product
 * column looks its value up by that same code and renders "—" when absent,
 * keeping rows aligned across products that don't share an identical spec
 * set. `derivePrice`/`deriveStock` mirror the same helpers in
 * `product-card.tsx` / `compare-table.tsx` (cheapest calculated variant
 * price + "from" range flag; aggregated stock + backorder flag).
 */

import Image from "next/image"
import Link from "next/link"
import type { HttpTypes } from "@medusajs/types"

import type { SpecValueDTO } from "@/lib/data/types"
import { Button } from "@/components/ui/button"
import { SectionHeading } from "@/components/shared/section-heading"
import { Price } from "@/components/shared/price"
import { StockPill } from "@/components/shared/stock-pill"
import { cn } from "@/lib/utils"

const MAX_COLUMNS = 5
const LABEL_COLUMN_WIDTH = 200

export interface ProductComparisonProps {
  products: HttpTypes.StoreProduct[]
  specsByProductId: Record<string, SpecValueDTO[]>
}

/** Cheapest calculated price across a product's variants, plus whether it's
 *  a range (mirrors the derivation in `product-card.tsx` / `compare-table.tsx`). */
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

/** Aggregated stock across a product's variants (mirrors `product-card.tsx` / `compare-table.tsx`). */
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

// Home ProductComparison — pinned config handles, server-fetched. Renders
// null with fewer than 2 products (nothing meaningful to compare).
export function ProductComparison({ products, specsByProductId }: ProductComparisonProps) {
  const columns = products.slice(0, MAX_COLUMNS)

  if (columns.length < 2) {
    return null
  }

  // Union of every `is_comparable` attribute across the visible columns.
  const attributeMap = new Map<string, { attribute: string; unit: string | null; order: number }>()
  columns.forEach((product) => {
    const specs = specsByProductId[product.id] ?? []
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

  const columnCount = columns.length
  const gridTemplateColumns = `${LABEL_COLUMN_WIDTH}px repeat(${columnCount}, minmax(180px, 1fr))`
  const minWidth = LABEL_COLUMN_WIDTH + columnCount * 200

  const rowClass = "grid gap-x-6 border-t border-[var(--color-athens-line)]"
  const labelCellClass =
    "sticky left-0 z-10 bg-white py-[15px] pr-4 text-[15px] font-medium text-[var(--color-athens-dark)]"
  const valueCellClass = "py-[15px] text-[15px] text-[var(--color-athens-body)]"

  return (
    <section className="athens-container my-[60px]">
      <SectionHeading title="Compare picks" />
      <div className="overflow-x-auto athens-no-scrollbar">
        <div style={{ minWidth }}>
          {/* Header row: image, title, View CTA */}
          <div className="grid gap-x-6" style={{ gridTemplateColumns }}>
            <div />
            {columns.map((product) => (
              <div key={product.id} className="pb-[15px]">
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
                  View
                </Button>
              </div>
            ))}
          </div>

          {/* Price */}
          <div className={rowClass} style={{ gridTemplateColumns }}>
            <div className={labelCellClass}>Price</div>
            {columns.map((product) => {
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
            {columns.map((product) => {
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
            {columns.map((product) => {
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
            {columns.map((product) => {
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
              {columns.map((product) => {
                const specs = specsByProductId[product.id] ?? []
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
    </section>
  )
}
