import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updatePricePreferencesWorkflow } from "@medusajs/medusa/core-flows"

/**
 * One-off migration: switch INR pricing to tax-EXCLUSIVE (B2B mode).
 *
 * Product prices in the admin are now entered as the base rate ex-GST; the
 * 18% GST from the `in` tax region is added on top at checkout. Run with:
 *
 *   npx medusa exec ./src/scripts/set-tax-exclusive.ts
 *
 * Note: existing catalog prices are NOT rewritten — they are now treated as
 * ex-GST base rates, so update them in the admin if they were entered as MRP.
 */
export default async function setTaxExclusive({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: preferences } = await query.graph({
    entity: "price_preference",
    fields: ["id", "attribute", "value", "is_tax_inclusive"],
    filters: { attribute: "currency_code", value: "inr" },
  })

  if (!preferences.length) {
    console.log("No INR price preference found — nothing to update.")
    return
  }

  await updatePricePreferencesWorkflow(container).run({
    input: {
      selector: { attribute: "currency_code", value: "inr" },
      update: { is_tax_inclusive: false },
    },
  })

  console.log(
    `Updated ${preferences.length} price preference(s): INR is now tax-exclusive.`
  )
}
