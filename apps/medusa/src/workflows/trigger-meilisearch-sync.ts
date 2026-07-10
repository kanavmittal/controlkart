import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { emitEventStep } from "@medusajs/medusa/core-flows"

/** Fires the `meilisearch.sync` event that `meilisearch-sync.ts` (the
 *  full-reconciliation subscriber) listens for. Kept as a workflow (rather
 *  than emitting directly from the admin route) per the project's
 *  business-logic-in-workflows convention — even though this workflow has
 *  no data mutation of its own, `emitEventStep` is the documented way to
 *  trigger a custom event from a workflow. */
export const triggerMeilisearchSyncWorkflow = createWorkflow(
  "trigger-meilisearch-sync",
  function (_input: Record<string, never>) {
    emitEventStep({
      eventName: "meilisearch.sync",
      data: {},
    })
    return new WorkflowResponse({ triggered: true })
  }
)
