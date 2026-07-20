"use client"

import { formatINR } from "@/lib/format"
import { useTaxConfig } from "@/lib/hooks/use-tax-config"
import { toExTax } from "@/lib/tax"
import { cn } from "@/lib/utils"
import { Price } from "./price"

type PriceBreakdownProps = {
  /** Σ item subtotals, pre-discount. For tax-inclusive pricing this is NET of
   *  tax (Medusa strips the included tax out of subtotals), so it is only used
   *  as the Subtotal row when prices are tax-exclusive. */
  itemSubtotal: number | null | undefined
  /** Σ item original totals, pre-discount. For tax-inclusive pricing this is
   *  the GROSS (tax-inclusive) amount — the Subtotal row uses it so the
   *  breakdown reads `subtotal − discount (+ shipping) = total`. */
  originalItemTotal?: number | null
  discountTotal?: number | null
  shippingTotal?: number | null
  taxTotal?: number | null
  total: number | null | undefined
  /** Shown in place of the shipping amount when shipping is not priced yet
   *  (shippingTotal null/0), e.g. "Calculated at checkout". */
  shippingNote?: string
  /** Muted line rendered under the shipping row (e.g. the shipping method
   *  name on the order details page). */
  shippingDetail?: string
  /** Compact typography for the cart drawer. */
  compact?: boolean
  className?: string
}

/**
 * The ONE canonical cart/order price breakdown — cart drawer, cart page,
 * checkout order summary and order details all render this so the visible
 * math is always consistent. Tax-INCLUSIVE carts: `Subtotal(gross) − Discount
 * (+ Shipping) = Total`, GST row informational. Tax-EXCLUSIVE carts (current
 * backend): `Subtotal(ex-tax) − Discount (+ Shipping) + GST = Total`, GST row
 * additive, with discount/shipping stripped of the tax portion Medusa keeps
 * inside them. Labels ("incl./excl. GST", rate) come from the backend tax
 * config via `useTaxConfig`.
 */
export function PriceBreakdown({
  itemSubtotal,
  originalItemTotal,
  discountTotal,
  shippingTotal,
  taxTotal,
  total,
  shippingNote,
  shippingDetail,
  compact = false,
  className,
}: PriceBreakdownProps) {
  const { priceIncludesTax, taxRate, taxLabel } = useTaxConfig()

  const subtotalLabel = priceIncludesTax
    ? `Subtotal (incl. ${taxLabel})`
    : `Subtotal (excl. ${taxLabel})`
  const subtotalAmount = priceIncludesTax
    ? (originalItemTotal ?? itemSubtotal)
    : itemSubtotal

  // Tax-exclusive carts: Medusa still computes `discount_total` and
  // `shipping_total` on the GROSS payable (promotions/shipping are priced
  // with their tax portion inside, and that tax lives in `tax_total`) —
  // verified live: 10% promo on ₹6,000 ex-tax → discount_total 708 (= 600
  // × 1.18), tax_total 972, total 6,372. Strip the tax portion so every row
  // above Total is ex-tax and the visible math stays
  // `Subtotal − Discount (+ Shipping) + GST = Total`.
  const discountAmount = priceIncludesTax
    ? (discountTotal ?? null)
    : toExTax(discountTotal, taxRate)
  const shippingAmount = priceIncludesTax
    ? (shippingTotal ?? null)
    : toExTax(shippingTotal, taxRate)

  const rateSuffix = taxRate !== null ? ` (${taxRate}%)` : ""
  const taxRowLabel = priceIncludesTax
    ? `Includes ${taxLabel}${rateSuffix}`
    : `${taxLabel}${rateSuffix}`

  const hasDiscount = (discountTotal ?? 0) > 0
  const hasTax = (taxTotal ?? 0) > 0
  const showShippingNote =
    shippingNote !== undefined &&
    (shippingTotal === null || shippingTotal === undefined || shippingTotal === 0)

  const rowClass = compact
    ? "flex items-baseline justify-between"
    : "flex items-baseline justify-between text-sm"
  const labelClass = compact
    ? "text-sm font-medium text-athens-dark"
    : "text-athens-body"
  const valueClass = compact
    ? "text-sm leading-none font-medium text-athens-dark"
    : "text-sm leading-none font-normal text-athens-dark"

  return (
    <div className={cn(compact ? "flex flex-col gap-1" : "flex flex-col gap-3", className)}>
      <div className={rowClass}>
        <span className={labelClass}>{subtotalLabel}</span>
        <Price amount={subtotalAmount} className={valueClass} />
      </div>

      {hasDiscount ? (
        <div className={rowClass}>
          <span
            className={
              compact ? "text-xs font-medium text-athens-success" : "text-athens-success"
            }
          >
            Discount
          </span>
          <span
            className={
              compact
                ? "text-xs font-medium text-athens-success"
                : "text-sm leading-none font-normal text-athens-success"
            }
          >
            −{formatINR(discountAmount)}
          </span>
        </div>
      ) : null}

      {showShippingNote ? (
        <div className={rowClass}>
          <span className={compact ? "text-xs text-athens-body" : "text-athens-body"}>
            Shipping
          </span>
          <span className="text-xs text-athens-body">{shippingNote}</span>
        </div>
      ) : (
        <div className={rowClass}>
          <span className={compact ? "text-xs text-athens-body" : "text-athens-body"}>
            Shipping
          </span>
          <Price amount={shippingAmount} className={valueClass} />
        </div>
      )}
      {shippingDetail ? (
        <div className="text-xs text-athens-body">{shippingDetail}</div>
      ) : null}

      {hasTax ? (
        <div className={rowClass}>
          <span className={compact ? "text-xs text-athens-body" : "text-athens-body"}>
            {taxRowLabel}
          </span>
          <Price amount={taxTotal} className={valueClass} />
        </div>
      ) : null}

      <div
        className={cn(
          "flex items-baseline justify-between border-t border-athens-line text-base font-semibold",
          compact ? "pt-2" : "pt-3"
        )}
      >
        <span className={compact ? "text-sm text-athens-dark" : "text-athens-dark"}>
          Total
        </span>
        <Price
          amount={total}
          className={
            compact
              ? "text-sm leading-none font-semibold text-athens-dark"
              : "text-base leading-none font-semibold text-athens-dark"
          }
        />
      </div>
    </div>
  )
}
