"use client"

import { formatINR } from "@/lib/format"
import { useTaxConfig } from "@/lib/hooks/use-tax-config"
import { Price } from "./price"

type ExTaxPriceProps = {
  /** Gross (tax-inclusive) current price — converted for display. */
  amount: number | null | undefined
  /** Gross (tax-inclusive) pre-sale price — converted for display. */
  originalAmount?: number | null
  /** Prefixes the current price with "From " (multi-variant / range price). */
  from?: boolean
  /** Matches `Price`'s variant: "inline" (cards/rows) or "stacked" (PDP). */
  variant?: "inline" | "stacked"
  /** Renders the muted "+ ₹X GST (n%)" line under the price. Default true —
   *  opt out where the tax is already broken out nearby (rare). */
  showTaxAmount?: boolean
  className?: string
}

/**
 * B2B product-price block: renders the amount EXCLUSIVE of GST (derived from
 * the stored tax-inclusive gross via `useTaxConfig`), an "excl. GST" note
 * (`TaxNote`), and the contained GST amount on a muted line below
 * ("+ ₹915.25 GST (18%)"). The displayed ex-tax/on-sale amounts are each
 * derived from their raw gross values — never from rounded display values —
 * so the sale-percentage pill and strikethrough math stay exact.
 *
 * When the ex-GST display mode is off (`lib/tax.ts` `DISPLAY_PRICES_EX_TAX`,
 * or prices stored tax-exclusive), this degrades to exactly the old `Price`
 * rendering (gross amount + tax note). Client island — server components can
 * render it with plain serializable props. `Price` itself stays a dumb
 * formatter; the conversion happens ONLY here and in `PriceBreakdown`.
 */
export function ExTaxPrice({
  amount,
  originalAmount,
  from = false,
  variant = "inline",
  showTaxAmount = true,
  className,
}: ExTaxPriceProps) {
  const { priceIncludesTax, taxRate, taxLabel, displayExTax, exTax, taxAmount } =
    useTaxConfig()

  if (!displayExTax) {
    return (
      <Price
        amount={amount}
        originalAmount={originalAmount}
        from={from}
        variant={variant}
        taxNote={variant === "inline"}
        gstNote={
          variant === "stacked"
            ? priceIncludesTax
              ? `Inclusive of ${taxLabel}`
              : `Exclusive of ${taxLabel}`
            : undefined
        }
        className={className}
      />
    )
  }

  const tax = taxAmount(amount)
  const rateSuffix = taxRate !== null ? ` (${taxRate}%)` : ""
  const taxLine =
    showTaxAmount && tax !== null && tax > 0 ? (
      <div className="text-[11px] leading-snug font-normal text-[var(--color-athens-body)]">
        + {formatINR(tax)} {taxLabel}
        {rateSuffix}
      </div>
    ) : null

  return (
    <div className={className}>
      <Price
        amount={exTax(amount)}
        originalAmount={exTax(originalAmount)}
        from={from}
        variant={variant}
        taxNote={variant === "inline"}
        gstNote={variant === "stacked" ? `Exclusive of ${taxLabel}` : undefined}
      />
      {taxLine}
    </div>
  )
}
