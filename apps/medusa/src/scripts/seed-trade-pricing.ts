import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createPriceListsWorkflow } from "@medusajs/medusa/core-flows"

/**
 * Creates a "Trade Pricing" price list (~8% off) for the Trade customer
 * group across all variants. Run with:
 *   npx medusa exec ./src/scripts/seed-trade-pricing.ts
 */
export default async function seedTradePricing({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const customerModuleService = container.resolve(Modules.CUSTOMER)

  const [tradeGroup] = await customerModuleService.listCustomerGroups({
    name: "Trade",
  })
  if (!tradeGroup) {
    logger.error("Trade customer group not found. Run the main seed first.")
    return
  }

  const { data: variants } = await query.graph({
    entity: "variant",
    fields: ["id", "sku", "prices.amount", "prices.currency_code"],
  })

  const prices = variants.flatMap((variant: any) =>
    (variant.prices ?? [])
      .filter((p: any) => p.currency_code === "inr")
      .map((p: any) => ({
        variant_id: variant.id,
        currency_code: "inr",
        amount: Math.round(p.amount * 0.92),
      }))
  )

  if (!prices.length) {
    logger.error("No INR variant prices found.")
    return
  }

  await createPriceListsWorkflow(container).run({
    input: {
      price_lists_data: [
        {
          title: "Trade Pricing",
          description: "Trade tier pricing (~8% off list) for approved partners.",
          status: "active",
          rules: { "customer.groups.id": [tradeGroup.id] },
          prices,
        },
      ],
    },
  })

  logger.info(
    `Created Trade Pricing price list with ${prices.length} prices for group ${tradeGroup.id}`
  )
}
