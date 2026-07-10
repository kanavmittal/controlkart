import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { triggerMeilisearchSyncWorkflow } from "../../../../workflows/trigger-meilisearch-sync"

/** Manual full-catalog reindex trigger. Requires admin auth by default (no
 *  route in this codebase opts out via an AUTHENTICATE override, and none
 *  is added here) — verified with a real unauthenticated request (401).
 *  Returns immediately; the actual reconciliation runs asynchronously in
 *  the `meilisearch-sync` subscriber, which also guards against overlapping
 *  concurrent runs. */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  await triggerMeilisearchSyncWorkflow(req.scope).run({ input: {} })
  res.status(202).json({ success: true })
}
