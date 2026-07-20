"use client"

import { useTaxConfig } from "@/lib/hooks/use-tax-config"

/**
 * Small "incl. GST" / "excl. GST" note rendered next to prices. The label
 * comes from the backend tax config (`useTaxConfig`) instead of a hardcoded
 * string; while loading (or if the endpoint is unreachable) it renders the
 * seeded default. In the ex-GST display mode (`lib/tax.ts`) it always reads
 * "excl. GST" — that is the whole point of the mode. Client island so the
 * shared `Price` component can stay server-safe.
 */
export function TaxNote({ className }: { className?: string }) {
  const { priceIncludesTax, taxLabel, displayExTax } = useTaxConfig()
  const prefix = displayExTax || !priceIncludesTax ? "excl." : "incl."
  return (
    <span className={className}>
      {prefix} {taxLabel}
    </span>
  )
}
