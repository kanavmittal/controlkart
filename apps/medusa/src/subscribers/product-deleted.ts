import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { deleteProductsFromMeilisearchWorkflow } from "../workflows/delete-products-from-meilisearch"

export default async function productDeletedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  try {
    await deleteProductsFromMeilisearchWorkflow(container).run({
      input: { ids: [data.id] },
    })
    logger.info(`[meilisearch] Removed product ${data.id} after product.deleted`)
  } catch (error) {
    logger.error(
      `[meilisearch] Failed to remove product ${data.id} after product.deleted: ${
        (error as Error).message
      }`
    )
  }
}

export const config: SubscriberConfig = {
  event: "product.deleted",
}
