import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { z } from "zod"
import { MedusaError } from "@medusajs/framework/utils"
import { WMS_MODULE } from "../../../../../modules/wms"
import type WmsModuleService from "../../../../../modules/wms/service"
import { validateBody } from "../../../../../workflows/create-purchase-order"

const VerifyAwbBodySchema = z.object({
  raw: z.string(),
})

/**
 * H7 step 1 of pack/ship: the packer re-scans the AWB printed on the label
 * and this endpoint confirms it matches the shipment's assigned AWB before
 * the pack photo (and later, shipping) is allowed. Only shipments that have
 * finished picking (status "picked") are eligible — unlike the pick-* routes
 * this does NOT also accept "label_ready".
 *
 * Always responds 200 with a verdict object on a match/mismatch (mirroring
 * pick-scan's style); a shipment in the wrong state is a real 409.
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { raw } = validateBody(VerifyAwbBodySchema, req.body)
  const { id } = req.params

  const wms: WmsModuleService = req.scope.resolve(WMS_MODULE)
  const [shipment] = await wms.listShipments({ id }, { take: 1 })

  if (!shipment) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Shipment "${id}" not found`
    )
  }

  if ((shipment as any).status !== "picked") {
    throw new MedusaError(
      MedusaError.Types.CONFLICT,
      `Shipment "${id}" is not ready for AWB verification (status: "${(shipment as any).status}")`
    )
  }

  const expectedAwb = ((shipment as any).awb ?? "").trim()
  const scannedAwb = raw.trim()

  if (!expectedAwb || scannedAwb !== expectedAwb) {
    return res.json({ verdict: "reject", code: "AWB_MISMATCH" })
  }

  const pickState = ((shipment as any).pick_state ?? {}) as Record<string, unknown>
  await wms.updateShipments({
    id,
    pick_state: {
      ...pickState,
      awb_verified_at: new Date().toISOString(),
    },
  } as any)

  return res.json({ verdict: "accept" })
}
