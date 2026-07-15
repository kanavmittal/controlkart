import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"
import { WMS_MODULE } from "../../../../../../../modules/wms"
import type WmsModuleService from "../../../../../../../modules/wms/service"
import {
  getPurchaseOrderWithLines,
  validateBody,
} from "../../../../../../../workflows/create-purchase-order"

const UpdateLineSchema = z.object({
  quantity_ordered: z.number().int().positive(),
})

/**
 * Load the PO, assert it's still draft (line edits are draft-only) and that
 * the line actually belongs to it.
 */
async function getEditableLine(scope: any, poId: string, lineId: string) {
  const purchaseOrder = await getPurchaseOrderWithLines(scope, poId)

  if (purchaseOrder.status !== "draft") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Lines can only be modified while the purchase order is in draft (current status: "${purchaseOrder.status}")`
    )
  }

  const line = (purchaseOrder.lines ?? []).find((l: any) => l.id === lineId)
  if (!line) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Line "${lineId}" was not found on purchase order "${poId}"`
    )
  }

  return line
}

/** Update a line's quantity on a DRAFT purchase order. */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id, line_id } = req.params
  const body = validateBody(UpdateLineSchema, req.body)

  await getEditableLine(req.scope, id, line_id)

  const wms: WmsModuleService = req.scope.resolve(WMS_MODULE)
  await wms.updatePurchaseOrderLines({
    id: line_id,
    quantity_ordered: body.quantity_ordered,
  })

  const updated = await getPurchaseOrderWithLines(req.scope, id)
  res.status(200).json({ purchase_order: updated })
}

/** Remove a line from a DRAFT purchase order. */
export async function DELETE(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id, line_id } = req.params

  await getEditableLine(req.scope, id, line_id)

  const wms: WmsModuleService = req.scope.resolve(WMS_MODULE)
  await wms.deletePurchaseOrderLines(line_id)

  res.status(200).json({
    id: line_id,
    object: "purchase_order_line",
    deleted: true,
  })
}
