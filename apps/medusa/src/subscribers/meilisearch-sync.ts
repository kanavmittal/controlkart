import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { syncProductsWorkflow } from "../workflows/sync-products-to-meilisearch"
import { deleteProductsFromMeilisearchWorkflow } from "../workflows/delete-products-from-meilisearch"
import { MEILISEARCH_MODULE } from "../modules/meilisearch"
import type MeilisearchModuleService from "../modules/meilisearch/service"

const CHUNK_SIZE = 50
const PAGE_SIZE = 200

// Module-level flag — sufficient for a single-instance backend (this
// project runs `workerMode: "shared"`, one process). Prevents two
// concurrent triggers (e.g. a double-click on the admin "reindex" action)
// from doubling indexing load.
let syncInProgress = false

/** Full-catalog reconciliation, triggered by the admin route
 *  (`trigger-meilisearch-sync` workflow) or the nightly resync job. Unlike
 *  the incremental per-product subscribers, this pages through EVERY
 *  product id regardless of status — not just published ones — so it can
 *  detect and remove index documents whose product no longer exists in
 *  Postgres at all (a hard delete whose `product.deleted` event was missed
 *  while Meilisearch was down). Reuses `syncProductsWorkflow`'s own
 *  published/unpublished split rather than re-implementing the mapping. */
export default async function meilisearchSyncHandler({
  container,
}: SubscriberArgs<Record<string, never>>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  if (syncInProgress) {
    logger.warn(
      "[meilisearch] Full resync already in progress — skipping this trigger"
    )
    return
  }
  syncInProgress = true

  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const allIds: string[] = []
    let offset = 0
    for (;;) {
      const { data: products } = await query.graph({
        entity: "product",
        fields: ["id"],
        // Explicit stable order — offset pagination without one has no
        // guaranteed row order in Postgres, which could skip or duplicate
        // ids across pages.
        pagination: { skip: offset, take: PAGE_SIZE, order: { id: "asc" } },
      })
      allIds.push(...products.map((product: { id: string }) => product.id))
      if (products.length < PAGE_SIZE) {
        break
      }
      offset += PAGE_SIZE
    }

    logger.info(
      `[meilisearch] Full resync: syncing ${allIds.length} products in chunks of ${CHUNK_SIZE}`
    )
    for (let i = 0; i < allIds.length; i += CHUNK_SIZE) {
      const chunk = allIds.slice(i, i + CHUNK_SIZE)
      await syncProductsWorkflow(container).run({
        input: { filters: { id: chunk } },
      })
    }

    const meilisearchService: MeilisearchModuleService =
      container.resolve(MEILISEARCH_MODULE)
    const indexedIds = await meilisearchService.allIndexedIds()
    const postgresIds = new Set(allIds)
    const candidateOrphanIds = indexedIds.filter((id) => !postgresIds.has(id))

    // Re-check candidates against Postgres directly (rather than trusting
    // the `allIds` snapshot taken before the chunked sync above, which can
    // take minutes on a real catalog) — a product created+published mid-run
    // would already be indexed by the incremental `product.created`
    // subscriber but absent from that stale snapshot, which would otherwise
    // make this loop delete a live product's search entry.
    let orphanIds: string[] = []
    if (candidateOrphanIds.length) {
      const { data: stillExisting } = await query.graph({
        entity: "product",
        fields: ["id"],
        filters: { id: candidateOrphanIds },
      })
      const stillExistingIds = new Set(
        stillExisting.map((product: { id: string }) => product.id)
      )
      orphanIds = candidateOrphanIds.filter((id) => !stillExistingIds.has(id))
    }

    if (orphanIds.length) {
      logger.info(
        `[meilisearch] Full resync: removing ${orphanIds.length} orphaned index document(s) with no matching product`
      )
      await deleteProductsFromMeilisearchWorkflow(container).run({
        input: { ids: orphanIds },
      })
    }

    logger.info("[meilisearch] Full resync complete")
  } catch (error) {
    logger.error(`[meilisearch] Full resync failed: ${(error as Error).message}`)
  } finally {
    syncInProgress = false
  }
}

export const config: SubscriberConfig = {
  event: "meilisearch.sync",
}
