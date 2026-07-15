import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"
import { WMS_MODULE } from "../../../../../../modules/wms"
import type WmsModuleService from "../../../../../../modules/wms/service"
import {
  getPurchaseOrderWithLines,
  resolveVariantSnapshots,
  validateBody,
} from "../../../../../../workflows/create-purchase-order"

const AddLineSchema = z.object({
  variant_id: z.string().min(1),
  quantity_ordered: z.number().int().positive(),
})

/** Add a line to a DRAFT purchase order (sku/title snapshotted). */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params
  const body = validateBody(AddLineSchema, req.body)

  const purchaseOrder = await getPurchaseOrderWithLines(req.scope, id)
  if (purchaseOrder.status !== "draft") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Lines can only be modified while the purchase order is in draft (current status: "${purchaseOrder.status}")`
    )
  }

  const snapshots = await resolveVariantSnapshots(req.scope, [body.variant_id])
  const snapshot = snapshots.get(body.variant_id)!

  const wms: WmsModuleService = req.scope.resolve(WMS_MODULE)
  await wms.createPurchaseOrderLines({
    purchase_order_id: id,
    variant_id: body.variant_id,
    sku: snapshot.sku,
    title: snapshot.title,
    quantity_ordered: body.quantity_ordered,
  })

  const updated = await getPurchaseOrderWithLines(req.scope, id)
  res.status(200).json({ purchase_order: updated })
}
