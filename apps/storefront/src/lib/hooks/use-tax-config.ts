"use client"

import { useQuery } from "@tanstack/react-query"
import { sdk } from "@/lib/sdk"
import { queryKeys } from "@/lib/query-keys"
import { DISPLAY_PRICES_EX_TAX, toExTax, taxPortion } from "@/lib/tax"

/** Tax display config consumed by the storefront (camelCase mirror of the
 *  `/store/tax-config` response). */
export type TaxConfig = {
  /** true → prices are tax-inclusive ("incl. GST"); false → "excl. GST". */
  priceIncludesTax: boolean
  /** Default tax rate percentage (e.g. 18); null when the region has none. */
  taxRate: number | null
  /** Display label for the tax (e.g. "GST"). */
  taxLabel: string
}

type TaxConfigResponse = {
  currency_code: string
  price_includes_tax: boolean
  tax_label: string
  tax_rate: number | null
}

/** Matches the live backend config (INR tax-EXCLUSIVE + 18% GST — see
 *  `apps/medusa/src/scripts/set-tax-exclusive.ts`) so an unreachable/failed
 *  endpoint never regresses the storefront's labels, and the loading window
 *  never treats already-ex-tax prices as tax-inclusive gross. */
export const DEFAULT_TAX_CONFIG: TaxConfig = {
  priceIncludesTax: false,
  taxRate: 18,
  taxLabel: "GST",
}

/**
 * Tax display config from the backend (`GET /store/tax-config`) — the single
 * source of truth for "incl. GST"/"excl. GST" notes and the GST rate shown in
 * price breakdowns. Effectively static → cached for the session (same pattern
 * as `useRegion`). Returns `DEFAULT_TAX_CONFIG` while loading or on error.
 *
 * Also exposes the ex-GST display mode (`lib/tax.ts`): `displayExTax` is true
 * only when the B2B flag is on AND stored prices actually include tax (when
 * they don't, gross == ex-tax and there is nothing to strip). `exTax` /
 * `taxAmount` are the `lib/tax` helpers pre-bound to the fetched rate AND the
 * display mode — they no-op when `displayExTax` is false, so callers can
 * apply them unconditionally without risking a double conversion.
 */
export function useTaxConfig() {
  const { data } = useQuery({
    queryKey: queryKeys.taxConfig,
    queryFn: async (): Promise<TaxConfig> => {
      const res = await sdk.client.fetch<TaxConfigResponse>("/store/tax-config")
      return {
        priceIncludesTax: res.price_includes_tax,
        taxRate: res.tax_rate,
        taxLabel: res.tax_label,
      }
    },
    staleTime: Infinity,
    gcTime: Infinity,
  })

  const config = data ?? DEFAULT_TAX_CONFIG
  const displayExTax = DISPLAY_PRICES_EX_TAX && config.priceIncludesTax

  return {
    ...config,
    /** true → display prices exclusive of tax, GST broken out separately. */
    displayExTax,
    /** Gross (tax-inclusive) → ex-tax amount; identity when !displayExTax. */
    exTax: (amount: number | null | undefined): number | null =>
      displayExTax ? toExTax(amount, config.taxRate) : (amount ?? null),
    /** Tax portion inside a gross amount; null when !displayExTax. */
    taxAmount: (amount: number | null | undefined): number | null =>
      displayExTax ? taxPortion(amount, config.taxRate) : null,
  }
}
