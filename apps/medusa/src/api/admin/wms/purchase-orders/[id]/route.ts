import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { z } from "zod"
import { WMS_MODULE } from "../../../../../modules/wms"
import type WmsModuleService from "../../../../../modules/wms/service"
import {
  assertStatusTransition,
  attachSuppliers,
  getPurchaseOrderWithLines,
  validateBody,
  type PurchaseOrderStatus,
} from "../../../../../workflows/create-purchase-order"

const UpdatePurchaseOrderSchema = z.object({
  status: z
    .enum(["draft", "open", "partially_received", "received", "cancelled"])
    .optional(),
  expected_date: z.coerce.date().nullable().optional(),
  notes: z.string().nullable().optional(),
})

/** Purchase order detail (with lines + supplier). */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const purchaseOrder = await getPurchaseOrderWithLines(req.scope, req.params.id)
  const [withSupplier] = await attachSuppliers(req.scope, [purchaseOrder])

  res.json({ purchase_order: withSupplier })
}

/** Update a purchase order: status transition and/or notes/expected_date. */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params
  const body = validateBody(UpdatePurchaseOrderSchema, req.body)

  const purchaseOrder = await getPurchaseOrderWithLines(req.scope, id)

  const updates: Record<string, unknown> = {}

  if (body.status !== undefined) {
    // Enforced server-side; illegal transitions (incl. no-ops) are 400s.
    assertStatusTransition(
      purchaseOrder.status as PurchaseOrderStatus,
      body.status
    )
    updates.status = body.status
  }
  if (body.expected_date !== undefined) {
    updates.expected_date = body.expected_date
  }
  if (body.notes !== undefined) {
    updates.notes = body.notes
  }

  if (Object.keys(updates).length) {
    const wms: WmsModuleService = req.scope.resolve(WMS_MODULE)
    await wms.updatePurchaseOrders({ id, ...updates })
  }

  const updated = await getPurchaseOrderWithLines(req.scope, id)
  const [withSupplier] = await attachSuppliers(req.scope, [updated])

  res.json({ purchase_order: withSupplier })
}
