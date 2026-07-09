import { formatINR } from "@/lib/format"
import { cn } from "@/lib/utils"

interface PriceProps {
  amount: number | null | undefined
  originalAmount?: number | null
  /** Accepted for forward-compat with a future multi-currency `formatINR`
   *  replacement; the store is INR-only today so this is currently unused —
   *  `formatINR` always formats as INR. */
  currencyCode?: string
  /** Prefixes the current price with "From " (multi-variant / range price). */
  from?: boolean
  /** Shows a small "incl. GST" note next to the current price. */
  taxNote?: boolean
  /** Renders a small "-N%" pill after the price when on sale. Default true —
   *  every `<Price>` consumer gets the indicator automatically; pass `false`
   *  to opt out (e.g. a context that already shows its own discount badge). */
  showDiscountPercent?: boolean
  className?: string
}

// Price block: optional "From" prefix, current price prominent (Athens
// dark), `originalAmount` as strikethrough + sale-red current price when
// `originalAmount > amount`, optional small tax-inclusive note. Amounts are
// already display-format major units (never divide by 100) — see
// lib/format.ts. `amount` null/undefined renders `formatINR`'s "—" fallback.
export function Price({
  amount,
  originalAmount,
  from = false,
  taxNote = false,
  showDiscountPercent = true,
  className,
}: PriceProps) {
  const onSale =
    typeof amount === "number" && typeof originalAmount === "number" && originalAmount > amount
  const discountPercent =
    onSale && originalAmount ? Math.round(((originalAmount - amount) / originalAmount) * 100) : null

  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2", className)}>
      {onSale ? (
        <s className="text-sm font-medium text-[var(--color-athens-body)]">{formatINR(originalAmount)}</s>
      ) : null}
      <span
        className={cn(
          "text-xl leading-8 font-medium",
          onSale ? "text-[var(--color-athens-sale)]" : "text-[var(--color-athens-dark)]"
        )}
      >
        {from ? <span className="mr-1 text-sm font-normal text-[var(--color-athens-body)]">From</span> : null}
        {formatINR(amount)}
        {taxNote ? (
          <span className="ml-1 text-[11px] font-normal text-[var(--color-athens-body)]">incl. GST</span>
        ) : null}
      </span>
      {onSale && showDiscountPercent && discountPercent ? (
        <span className="inline-flex items-center rounded-[var(--radius-badge)] bg-[var(--color-athens-sale-badge)] px-[7px] py-[2px] text-[12px] leading-[12px] font-medium text-white">
          -{discountPercent}%
        </span>
      ) : null}
    </div>
  )
}
