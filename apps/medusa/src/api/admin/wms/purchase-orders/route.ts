import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { z } from "zod"
import {
  attachSuppliers,
  createPurchaseOrderWorkflow,
  getPurchaseOrderWithLines,
  validateBody,
} from "../../../../workflows/create-purchase-order"

const CreatePurchaseOrderSchema = z.object({
  supplier_id: z.string().min(1),
  expected_date: z.coerce.date().nullable().optional(),
  notes: z.string().nullable().optional(),
  lines: z
    .array(
      z.object({
        variant_id: z.string().min(1),
        quantity_ordered: z.number().int().positive(),
      })
    )
    .default([]),
})

/** List purchase orders (with lines + supplier), newest first. */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const limit = Math.min(Number(req.query.limit) || 50, 200)
  const offset = Number(req.query.offset) || 0

  const { data, metadata } = await query.graph({
    entity: "purchase_order",
    fields: ["*", "lines.*"],
    pagination: {
      take: limit,
      skip: offset,
      // display_id is strictly monotonic — newest first
      order: { display_id: "DESC" },
    },
  })

  const purchase_orders = await attachSuppliers(req.scope, data as any[])

  res.json({
    purchase_orders,
    count: metadata?.count ?? purchase_orders.length,
    limit,
    offset,
  })
}

/** Create a draft purchase order with lines (sku/title snapshotted). */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const body = validateBody(CreatePurchaseOrderSchema, req.body)

  const { result } = await createPurchaseOrderWorkflow(req.scope).run({
    input: {
      supplier_id: body.supplier_id,
      expected_date: body.expected_date ? body.expected_date.toISOString() : null,
      notes: body.notes ?? null,
      lines: body.lines,
    },
  })

  const purchaseOrder = await getPurchaseOrderWithLines(req.scope, result.id)
  const [withSupplier] = await attachSuppliers(req.scope, [purchaseOrder])

  res.status(200).json({ purchase_order: withSupplier })
}
