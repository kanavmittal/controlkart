import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { z } from "zod"
import { validateBody } from "../../../../../workflows/create-purchase-order"
import { receivePurchaseOrderWorkflow } from "../../../../../workflows/receive-purchase-order"

const ReceiveItemSchema = z.object({
  line_id: z.string(),
  serials: z.array(z.string()).optional(),
  quantity: z.number().positive().optional(),
})

const ReceiveBodySchema = z.object({
  session_id: z.string(),
  items: z.array(ReceiveItemSchema).min(1),
})

/**
 * Commit a receiving session against an open/partially_received purchase
 * order: creates serial_units (for serialized lines), bumps inventory, and
 * advances the PO's line/status state. Idempotent on session_id — the
 * warehouse app retries this on flaky Wi-Fi.
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { session_id, items } = validateBody(ReceiveBodySchema, req.body)
  const { id } = req.params

  const { result: purchaseOrder } = await receivePurchaseOrderWorkflow(
    req.scope
  ).run({
    input: {
      po_id: id,
      session_id,
      staff_id: req.auth_context.actor_id,
      items,
    },
  })

  res.json({ purchase_order: purchaseOrder })
}
