import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { updateShippingOptionsWorkflow } from "@medusajs/medusa/core-flows"

/**
 * Repoints the store's active (non-return) shipping options from whatever
 * fulfillment provider they currently use onto the Shiprocket provider
 * registered by `@sam-ael/medusa-plugin-shiprocket` (see `medusa-config.ts`),
 * using the provider's `shiprocket-standard` fulfillment option. Return-type
 * shipping options (rule `is_return = true`), if any exist, are left alone.
 *
 * Idempotent: shipping options already on the shiprocket provider are
 * skipped, so a second run reports `repointed 0`.
 *
 * Also ensures (idempotently) that every stock location backing an affected
 * shipping option's service zone is linked to the shiprocket provider in the
 * fulfillment module — Medusa's `updateShippingOptionsWorkflow` validates
 * that a shipping option's provider is enabled for its service zone's stock
 * location(s), and only `medusa_manual` is linked by the seed script.
 *
 * Usage:
 *   npx medusa exec ./src/scripts/repoint-shipping-option.ts
 *
 * WARNING — this is a STAGING / local script. It is safe to run repeatedly
 * against staging or a local DB. The PRODUCTION run only happens once, at
 * launch, with the user's explicit approval (see tasks/todo.md J5) — do NOT
 * run this against prod outside that step.
 *
 * IMPORTANT: after running this (staging or prod), checkout must be
 * re-verified end-to-end — placing an order through the repointed shipping
 * option exercises the Shiprocket provider's `validateFulfillmentData` and
 * `calculatePrice` methods for the first time, and those depend on things
 * this script cannot check (e.g. a Stock Location with a real address for
 * pickup postcode, item weights for rate calculation).
 */
export default async function repointShippingOption({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT)

  const SHIPROCKET_PROVIDER_ID = "shiprocket_shiprocket"
  const SHIPROCKET_STANDARD_OPTION_ID = "shiprocket-standard"

  // ---------------------------------------------------------------------
  // 1. Verify (don't create) the shiprocket fulfillment provider row.
  // ---------------------------------------------------------------------
  const providers = await fulfillmentModuleService.listFulfillmentProviders({
    id: SHIPROCKET_PROVIDER_ID,
  })
  const shiprocketProvider = providers[0]

  if (!shiprocketProvider) {
    throw new Error(
      `Shiprocket fulfillment provider ("${SHIPROCKET_PROVIDER_ID}") was not found in the ` +
        `fulfillment module.\n` +
        `This row is created/enabled automatically by Medusa when the plugin is registered in ` +
        `medusa-config.ts (gated on the SHIPROCKET_EMAIL env var) and the app loads its modules.\n` +
        `Fix: set SHIPROCKET_EMAIL (and SHIPROCKET_PASSWORD) in the environment and re-run this ` +
        `script — "medusa exec" runs the full loader chain on every invocation, so no separate ` +
        `server restart is required.\n` +
        `Example:\n` +
        `  SHIPROCKET_EMAIL=dummy@local.test SHIPROCKET_PASSWORD=dummy \\\n` +
        `  npx medusa exec ./src/scripts/repoint-shipping-option.ts`
    )
  }

  // `is_enabled` is a real column on the fulfillment_provider model, but it's
  // omitted from the module service's FulfillmentProviderDTO type — cast to
  // read it.
  if (!(shiprocketProvider as unknown as { is_enabled: boolean }).is_enabled) {
    throw new Error(
      `Shiprocket fulfillment provider ("${SHIPROCKET_PROVIDER_ID}") exists but is disabled ` +
        `(is_enabled = false). This usually happens if the provider was previously registered and ` +
        `then removed from medusa-config.ts while its DB row persisted.\n` +
        `Fix: confirm SHIPROCKET_EMAIL is set and the shiprocket provider block in medusa-config.ts ` +
        `is intact, then re-run this script.`
    )
  }

  logger.info(
    `Shiprocket fulfillment provider "${SHIPROCKET_PROVIDER_ID}" is registered and enabled.`
  )

  // The provider's own fulfillment options are the source of truth for what
  // goes into a shipping option's `data` column (this mirrors what the admin
  // dashboard does when you pick a fulfillment option in the UI: it stores
  // the whole option object returned by getFulfillmentOptions(), not just
  // its id).
  const fulfillmentOptions =
    await fulfillmentModuleService.retrieveFulfillmentOptions(SHIPROCKET_PROVIDER_ID)
  const standardOption = fulfillmentOptions.find(
    (option: Record<string, unknown>) => option.id === SHIPROCKET_STANDARD_OPTION_ID
  )

  if (!standardOption) {
    throw new Error(
      `Shiprocket provider's getFulfillmentOptions() did not return an option with id ` +
        `"${SHIPROCKET_STANDARD_OPTION_ID}". Got: ${JSON.stringify(fulfillmentOptions)}`
    )
  }

  // ---------------------------------------------------------------------
  // 2. List the store's active shipping options and print the BEFORE table.
  // ---------------------------------------------------------------------
  const shippingOptions = await fulfillmentModuleService.listShippingOptions(
    {},
    { relations: ["rules"] }
  )

  const isReturnOption = (option: { rules?: { attribute: string; value: unknown }[] }) =>
    (option.rules ?? []).some(
      (rule) => rule.attribute === "is_return" && rule.value === "true"
    )

  const printTable = (label: string, options: typeof shippingOptions) => {
    console.log(`\n${label}`)
    if (!options.length) {
      console.log("  (no active shipping options)")
      return
    }
    console.table(
      options.map((option) => ({
        id: option.id,
        name: option.name,
        provider_id: option.provider_id,
        data: JSON.stringify(option.data ?? null),
        is_return: isReturnOption(option),
      }))
    )
  }

  printTable("BEFORE — active shipping options:", shippingOptions)

  const returnOptions = shippingOptions.filter((option) => isReturnOption(option))
  const alreadyOnShiprocket = shippingOptions.filter(
    (option) => option.provider_id === SHIPROCKET_PROVIDER_ID
  )
  const toRepoint = shippingOptions.filter(
    (option) =>
      option.provider_id !== SHIPROCKET_PROVIDER_ID && !isReturnOption(option)
  )

  // ---------------------------------------------------------------------
  // 3. Ensure the stock locations backing the affected service zones are
  //    linked to the shiprocket provider (idempotent) — required for
  //    updateShippingOptionsWorkflow's provider validation to pass.
  // ---------------------------------------------------------------------
  if (toRepoint.length) {
    const serviceZoneIds = Array.from(
      new Set(toRepoint.map((option) => option.service_zone_id).filter(Boolean))
    )

    const { data: serviceZones } = await query.graph({
      entity: "service_zone",
      fields: [
        "id",
        "fulfillment_set.location.id",
        "fulfillment_set.location.fulfillment_providers.id",
      ],
      filters: { id: serviceZoneIds },
    })

    const stockLocationIds = new Set<string>()
    for (const zone of serviceZones) {
      const stockLocation = zone.fulfillment_set?.location
      if (!stockLocation) {
        continue
      }
      const alreadyLinked = (stockLocation.fulfillment_providers ?? []).some(
        (provider: { id: string } | null) => provider?.id === SHIPROCKET_PROVIDER_ID
      )
      if (!alreadyLinked) {
        stockLocationIds.add(stockLocation.id)
      }
    }

    if (stockLocationIds.size) {
      await link.create(
        Array.from(stockLocationIds).map((stockLocationId) => ({
          [Modules.STOCK_LOCATION]: { stock_location_id: stockLocationId },
          [Modules.FULFILLMENT]: { fulfillment_provider_id: SHIPROCKET_PROVIDER_ID },
        }))
      )
      logger.info(
        `Linked ${stockLocationIds.size} stock location(s) to the shiprocket provider: ` +
          `${Array.from(stockLocationIds).join(", ")}`
      )
    } else {
      logger.info(
        "All stock locations backing the affected shipping options are already linked to the " +
          "shiprocket provider."
      )
    }
  }

  // ---------------------------------------------------------------------
  // 4. Repoint every non-shiprocket, non-return shipping option.
  // ---------------------------------------------------------------------
  if (toRepoint.length) {
    await updateShippingOptionsWorkflow(container).run({
      input: toRepoint.map((option) => ({
        id: option.id,
        provider_id: SHIPROCKET_PROVIDER_ID,
        data: standardOption,
      })),
    })
  }

  // ---------------------------------------------------------------------
  // 5. AFTER table + summary.
  // ---------------------------------------------------------------------
  const afterOptions = await fulfillmentModuleService.listShippingOptions(
    {},
    { relations: ["rules"] }
  )
  printTable("AFTER — active shipping options:", afterOptions)

  console.log(
    `\nSummary: repointed ${toRepoint.length}, skipped ${alreadyOnShiprocket.length} ` +
      `(already on shiprocket), left alone ${returnOptions.length} (returns)`
  )

  if (toRepoint.length) {
    logger.info(
      "Shipping options repointed to shiprocket. Checkout must now be re-verified end-to-end: " +
        "place a test order through one of the repointed shipping options and confirm the " +
        "Shiprocket provider's validateFulfillmentData()/calculatePrice() path succeeds " +
        "(requires a Stock Location with a real pickup address and item weights on variants)."
    )
  } else {
    logger.info("No-op: all active, non-return shipping options are already on shiprocket.")
  }
}
