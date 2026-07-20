/**
 * B2B display mode: prices are STORED tax-inclusive (backend INR price
 * preference) but SHOWN exclusive of GST, with the GST amount broken out
 * separately. Pure display-layer — charged totals are untouched. Flip to
 * false to revert to tax-inclusive presentation everywhere.
 */
export const DISPLAY_PRICES_EX_TAX = true

/**
 * exTax(gross) = gross / (1 + rate/100). Null-safe: null/undefined amounts
 * pass through as null; a null/non-positive rate means "no tax to strip" and
 * the amount comes back unchanged.
 */
export function toExTax(
  amount: number | null | undefined,
  rate: number | null
): number | null {
  if (amount === null || amount === undefined) return null
  if (rate === null || rate <= 0) return amount
  return amount / (1 + rate / 100)
}

/**
 * taxPortion(gross) = gross − exTax(gross) — the tax contained INSIDE a
 * tax-inclusive amount. Null-safe like `toExTax`; returns 0 when there is no
 * rate to strip.
 */
export function taxPortion(
  amount: number | null | undefined,
  rate: number | null
): number | null {
  if (amount === null || amount === undefined) return null
  if (rate === null || rate <= 0) return 0
  return amount - amount / (1 + rate / 100)
}

/**
 * taxOnTop(base) = base × rate/100 — the tax to ADD to an ex-tax base (the
 * current backend mode: prices are stored/displayed ex-GST, GST charged on
 * top). Null-safe like `toExTax`; returns 0 when there is no rate.
 */
export function taxOnTop(
  amount: number | null | undefined,
  rate: number | null
): number | null {
  if (amount === null || amount === undefined) return null
  if (rate === null || rate <= 0) return 0
  return (amount * rate) / 100
}
