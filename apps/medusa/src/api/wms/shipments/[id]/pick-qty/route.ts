import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { z } from "zod"
import { MedusaError } from "@medusajs/framework/utils"
import { WMS_MODULE } from "../../../../../modules/wms"
import type WmsModuleService from "../../../../../modules/wms/service"
import { validateBody } from "../../../../../workflows/create-purchase-order"
import {
  computeProgress,
  getOrderItemsForPick,
  isFullyPicked,
  loadPickableShipment,
  normalizePickState,
} from "../../by-awb/[awb]/route"

const PickQtyBodySchema = z.object({
  variant_id: z.string(),
  quantity: z.number().int().positive(),
})

/**
 * Records a manual quantity pick for a NON-serialized order line. `quantity`
 * is a delta — the count just picked in this action — added on top of
 * whatever's already recorded in pick_state.quantities for the variant
 * (mirroring pick-scan's one-call-per-unit model, just batched since
 * non-serialized units aren't individually scannable). Never mutates Medusa
 * inventory/order state — stock already moved at order placement.
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { variant_id, quantity } = validateBody(PickQtyBodySchema, req.body)
  const { id } = req.params

  const shipment = await loadPickableShipment(
    req.scope,
    { id },
    `Shipment "${id}" not found`
  )

  const wms: WmsModuleService = req.scope.resolve(WMS_MODULE)
  const items = await getOrderItemsForPick(req.scope, (shipment as any).order_id)

  const item = items.find((i) => i.variant_id === variant_id)
  if (!item) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Variant "${variant_id}" is not on this shipment's order`
    )
  }
  if (item.serialized) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Variant "${variant_id}" is serialized — pick it via pick-scan, not pick-qty`
    )
  }

  const pickState = normalizePickState((shipment as any).pick_state)
  const currentPicked = pickState.quantities[variant_id] ?? 0
  const newPicked = currentPicked + quantity

  if (newPicked > item.quantity) {
    return res.json({ verdict: "reject", code: "OVER_SCAN" })
  }

  const nextPickState = {
    serials: pickState.serials,
    quantities: { ...pickState.quantities, [variant_id]: newPicked },
  }

  const progressAfter = computeProgress(items, nextPickState)
  const allPicked = isFullyPicked(progressAfter)

  await wms.updateShipments({
    id: (shipment as any).id,
    pick_state: nextPickState,
    ...(allPicked ? { status: "picked" } : {}),
  } as any)

  return res.json({
    verdict: "accept",
    progress: progressAfter,
    all_picked: allPicked,
  })
}
