import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { z } from "zod"
import { validateBody } from "../../../workflows/create-purchase-order"
import { stockTakeWorkflow } from "../../../workflows/stock-take"

const StockTakeItemSchema = z.object({
  variant_id: z.string(),
  serials: z.array(z.string()).min(1),
})

const StockTakeBodySchema = z.object({
  session_id: z.string(),
  items: z.array(StockTakeItemSchema).min(1),
})

/**
 * PO-less serial registration for the launch backfill. Existing shelf stock
 * already has correct Medusa quantities — this only ATTACHES serials to it.
 * Zero inventory changes, ever. Idempotent on session_id.
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { session_id, items } = validateBody(StockTakeBodySchema, req.body)

  const { result } = await stockTakeWorkflow(req.scope).run({
    input: {
      staff_id: req.auth_context.actor_id,
      session_id,
      items,
    },
  })

  res.json({
    committed: true,
    serial_count: result.serial_count,
    already_committed: result.already_committed,
  })
}
