import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/** Strips a trailing rate percentage from a seeded rate name ("GST 18%" →
 *  "GST") — the rate itself is displayed separately as `({tax_rate}%)`, so
 *  keeping it in the label would render "GST 18% (18%)". */
function toTaxLabel(rateName: string | null | undefined): string {
  const label = (rateName ?? "").replace(/\s*\d+(\.\d+)?\s*%$/, "").trim()
  return label || "GST"
}

/** Storefront-facing tax display config: whether INR prices are tax-inclusive
 *  (seeded price preference) plus the `in` tax region's default rate label and
 *  percentage. The storefront derives every "incl./excl. GST" note and GST-rate
 *  display from this instead of hardcoding them. Public, publishable-key-scoped
 *  like other /store routes — no middleware entry needed. */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: pricePreferences } = await query.graph({
    entity: "price_preference",
    fields: ["attribute", "value", "is_tax_inclusive"],
    filters: { attribute: "currency_code", value: "inr" },
  })

  const { data: taxRegions } = await query.graph({
    entity: "tax_region",
    fields: [
      "country_code",
      "tax_rates.rate",
      "tax_rates.name",
      "tax_rates.code",
      "tax_rates.is_default",
    ],
    filters: { country_code: "in" },
  })

  const taxRates = taxRegions.flatMap((region) => region.tax_rates ?? [])
  const defaultRate =
    taxRates.find((rate) => rate?.is_default) ?? taxRates[0] ?? null

  res.json({
    currency_code: "inr",
    price_includes_tax: pricePreferences[0]?.is_tax_inclusive ?? false,
    tax_label: toTaxLabel(defaultRate?.name),
    tax_rate: defaultRate?.rate ?? null,
  })
}
