import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { MEILISEARCH_MODULE } from "../modules/meilisearch"
import type MeilisearchModuleService from "../modules/meilisearch/service"

type DeleteProductsFromMeilisearchInput = { ids: string[] }

/** Shared with `syncProductsWorkflow` (unpublished products are routed here
 *  in the same run) and the `product.deleted` subscriber. No compensation —
 *  a missing search-index entry isn't something to roll back, and
 *  `deleteFromIndex` is a no-op for ids that were never indexed, so it's
 *  always safe to retry. */
export const deleteProductsFromMeilisearchStep = createStep(
  "delete-products-from-meilisearch",
  async (input: DeleteProductsFromMeilisearchInput, { container }) => {
    const meilisearchService: MeilisearchModuleService =
      container.resolve(MEILISEARCH_MODULE)
    await meilisearchService.deleteFromIndex(input.ids)
    return new StepResponse(input.ids)
  }
)

export const deleteProductsFromMeilisearchWorkflow = createWorkflow(
  "delete-products-from-meilisearch",
  function (input: DeleteProductsFromMeilisearchInput) {
    const ids = deleteProductsFromMeilisearchStep(input)
    return new WorkflowResponse(ids)
  }
)
