import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { packAndShipWorkflow } from "../../../../../workflows/pack-and-ship"

/**
 * H7 step 3 of pack/ship: commits the outbound shipment. All the actual
 * validation (shipment picked, AWB verified, pack photo present) and
 * mutation logic lives in packAndShipWorkflow — see that file for the
 * full design.
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params
  const staffId = req.auth_context.actor_id

  const { result } = await packAndShipWorkflow(req.scope).run({
    input: { shipment_id: id, staff_id: staffId },
  })

  return res.json({ shipment: result })
}
