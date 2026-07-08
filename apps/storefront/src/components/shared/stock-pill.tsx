import { cn } from "@/lib/utils"

interface StockPillProps {
  /** Available quantity for the selected variant (or aggregated across
   *  variants at the card level). `null`/`undefined` when unknown (e.g.
   *  still loading, or nothing selected yet). */
  availableQuantity?: number | null
  /** True when the item can be purchased even with zero tracked quantity —
   *  mirrors `manage_inventory === false || allow_backorder === true` from
   *  `lib/hooks/use-product-live.ts`'s `purchasableByVariant` derivation.
   *  Combined with `availableQuantity > 0` that reproduces the exact
   *  `purchasable` rule used by the live product hook. */
  canBackorder?: boolean
  className?: string
}

const LOW_STOCK_THRESHOLD = 5

const pillBase =
  "inline-flex items-center gap-[5px] rounded-[var(--radius-badge)] px-[10px] py-[3px] text-[12px] leading-[12px] font-medium uppercase"

// Athens stock pill — rounded 24px (`--radius-badge`), tinted bg + colored
// text per tier. Tiers ported from the old `products/stock-badge.tsx`
// (out of stock / low <=5 / in stock), extended with the `purchasable` rule
// from `use-product-live.ts` so untracked/backorderable variants don't read
// as "out of stock" just because their tracked quantity is 0.
// Do not delete `products/stock-badge.tsx` here — deletion owner is T27.
export function StockPill({ availableQuantity, canBackorder = false, className }: StockPillProps) {
  const purchasable = canBackorder || (typeof availableQuantity === "number" && availableQuantity > 0)

  if (!purchasable) {
    return (
      <span className={cn(pillBase, "bg-destructive/10 text-destructive", className)}>
        <span className="size-[6px] rounded-full bg-destructive" />
        Out of stock
      </span>
    )
  }

  if (typeof availableQuantity === "number" && availableQuantity <= LOW_STOCK_THRESHOLD) {
    return (
      <span
        className={cn(
          pillBase,
          "bg-[var(--color-athens-warning-bg)] text-[var(--color-athens-warning)]",
          className
        )}
      >
        <span className="size-[6px] rounded-full bg-[var(--color-athens-warning)]" />
        Low stock · {availableQuantity} left
      </span>
    )
  }

  return (
    <span
      className={cn(
        pillBase,
        "bg-[var(--color-athens-success-bg)] text-[var(--color-athens-success)]",
        className
      )}
    >
      <span className="size-[6px] rounded-full bg-[var(--color-athens-success)]" />
      In stock{typeof availableQuantity === "number" ? ` · ${availableQuantity} units` : ""}
    </span>
  )
}
