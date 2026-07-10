import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { syncProductsWorkflow } from "../workflows/sync-products-to-meilisearch"

export default async function productCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  try {
    await syncProductsWorkflow(container).run({
      input: { filters: { id: [data.id] } },
    })
    logger.info(`[meilisearch] Synced product ${data.id} after product.created`)
  } catch (error) {
    logger.error(
      `[meilisearch] Failed to sync product ${data.id} after product.created: ${
        (error as Error).message
      }`
    )
  }
}

export const config: SubscriberConfig = {
  event: "product.created",
}
