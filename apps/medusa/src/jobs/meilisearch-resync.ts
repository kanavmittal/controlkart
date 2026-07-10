import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { triggerMeilisearchSyncWorkflow } from "../workflows/trigger-meilisearch-sync"

/** Nightly safety net, not just a nice-to-have: price-list-only edits and
 *  category renames may not emit `product.updated` in Medusa v2, so the
 *  Meilisearch price/category-name snapshot (which the header typeahead
 *  displays) can go stale between real product edits. This re-triggers the
 *  same full-reconciliation sweep the admin "reindex" action uses (see
 *  `meilisearch-sync.ts`), which also removes orphaned index documents —
 *  reusing that event rather than re-implementing sync logic here. */
export default async function meilisearchNightlyResyncJob(
  container: MedusaContainer
) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  try {
    logger.info("[meilisearch] Nightly resync: triggering full reconciliation")
    await triggerMeilisearchSyncWorkflow(container).run({ input: {} })
  } catch (error) {
    logger.error(
      `[meilisearch] Nightly resync failed to trigger: ${(error as Error).message}`
    )
  }
}

export const config = {
  name: "meilisearch-nightly-resync",
  schedule: "0 3 * * *", // Every day at 3 AM
}
