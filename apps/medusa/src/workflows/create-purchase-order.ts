import {
  createStep,
  createWorkflow,
  StepResponse,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  ContainerRegistrationKeys,
  generateEntityId,
  MedusaError,
} from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import type { z } from "zod"
import { WMS_MODULE } from "../modules/wms"
import type WmsModuleService from "../modules/wms/service"

/* ------------------------------------------------------------------------ *
 * Shared purchase-order helpers (used by the workflow AND the admin routes) *
 * ------------------------------------------------------------------------ */

export type PurchaseOrderStatus =
  | "draft"
  | "open"
  | "partially_received"
  | "received"
  | "cancelled"

/**
 * Legal server-side status transitions:
 *   draft → open → (partially_received →) received
 *   draft | open → cancelled
 * Anything else (including no-op transitions) is rejected.
 */
export const PO_STATUS_TRANSITIONS: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
  draft: ["open", "cancelled"],
  open: ["partially_received", "received", "cancelled"],
  partially_received: ["received"],
  received: [],
  cancelled: [],
}

export function assertStatusTransition(
  from: PurchaseOrderStatus,
  to: PurchaseOrderStatus
): void {
  if (!PO_STATUS_TRANSITIONS[from]?.includes(to)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Illegal purchase order status transition: "${from}" → "${to}"`
    )
  }
}

/** Parse a request body with Zod, mapping failures to a 400 MedusaError. */
export function validateBody<S extends z.ZodTypeAny>(
  schema: S,
  body: unknown
): z.infer<S> {
  const result = schema.safeParse(body ?? {})
  if (!result.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      result.error.issues
        .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
        .join("; ")
    )
  }
  return result.data
}

export type VariantSnapshot = {
  variant_id: string
  sku: string
  title: string
}

/**
 * Resolve product variants via Query and snapshot their sku/title for
 * purchase order lines. Throws 400 if any variant doesn't exist.
 */
export async function resolveVariantSnapshots(
  container: MedusaContainer,
  variantIds: string[]
): Promise<Map<string, VariantSnapshot>> {
  const uniqueIds = [...new Set(variantIds)]
  const snapshots = new Map<string, VariantSnapshot>()
  if (!uniqueIds.length) {
    return snapshots
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: variants } = await query.graph({
    entity: "variant",
    fields: ["id", "sku", "title", "product.title"],
    filters: { id: uniqueIds },
  })

  for (const variant of variants as any[]) {
    snapshots.set(variant.id, {
      variant_id: variant.id,
      sku: variant.sku ?? "",
      title: variant.title ?? variant.product?.title ?? variant.sku ?? variant.id,
    })
  }

  const missing = uniqueIds.filter((id) => !snapshots.has(id))
  if (missing.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Unknown product variant(s): ${missing.join(", ")}`
    )
  }

  return snapshots
}

/** Retrieve a purchase order with its lines, or throw a 404. */
export async function getPurchaseOrderWithLines(
  container: MedusaContainer,
  id: string
): Promise<any> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "purchase_order",
    fields: ["*", "lines.*"],
    filters: { id },
  })

  const purchaseOrder = (data as any[])[0]
  if (!purchaseOrder) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Purchase order with id "${id}" was not found`
    )
  }
  return purchaseOrder
}

/**
 * Attach the supplier record to each PO. supplier_id is a plain column (no
 * relation/link), so suppliers are fetched from the wms module and stitched.
 */
export async function attachSuppliers(
  container: MedusaContainer,
  purchaseOrders: any[]
): Promise<any[]> {
  const supplierIds = [
    ...new Set(purchaseOrders.map((po) => po.supplier_id).filter(Boolean)),
  ]
  if (!supplierIds.length) {
    return purchaseOrders.map((po) => ({ ...po, supplier: null }))
  }

  const wms: WmsModuleService = container.resolve(WMS_MODULE)
  const suppliers = await wms.listSuppliers({ id: supplierIds })
  const byId = new Map(suppliers.map((s: any) => [s.id, s]))

  return purchaseOrders.map((po) => ({
    ...po,
    supplier: byId.get(po.supplier_id) ?? null,
  }))
}

/* ------------------------------------------------------------------------ *
 * Workflow: create a purchase order (draft) with lines                      *
 * ------------------------------------------------------------------------ */

export type CreatePurchaseOrderInput = {
  supplier_id: string
  /** ISO date string */
  expected_date?: string | null
  notes?: string | null
  lines: { variant_id: string; quantity_ordered: number }[]
}

type ResolvedLine = {
  variant_id: string
  sku: string
  title: string
  quantity_ordered: number
}

/** Snapshot sku/title from the product variants at creation time. */
const resolvePurchaseOrderLinesStep = createStep(
  "resolve-purchase-order-lines",
  async (input: CreatePurchaseOrderInput, { container }) => {
    const snapshots = await resolveVariantSnapshots(
      container,
      input.lines.map((l) => l.variant_id)
    )

    const lines: ResolvedLine[] = input.lines.map((line) => {
      const snap = snapshots.get(line.variant_id)!
      return {
        variant_id: line.variant_id,
        sku: snap.sku,
        title: snap.title,
        quantity_ordered: line.quantity_ordered,
      }
    })

    return new StepResponse(lines)
  }
)

/**
 * Create the purchase_order row with a race-safe sequential display_id.
 *
 * The next display_id is assigned under a pg advisory transaction lock, and
 * the row is inserted in the SAME transaction — so the lock is only released
 * once the row (and its display_id) is committed. Concurrent creations
 * serialize on the lock and can never observe the same MAX(display_id).
 * (Application-code approach on purpose: no hand-written sequence migration.)
 */
const createPurchaseOrderRecordStep = createStep(
  "create-purchase-order-record",
  async (input: CreatePurchaseOrderInput, { container }) => {
    const pg = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as any
    const id = generateEntityId(undefined as unknown as string, "wpo")

    await pg.transaction(async (trx: any) => {
      await trx.raw(
        "SELECT pg_advisory_xact_lock(hashtext('wms_purchase_order_display_id'))"
      )
      const { rows } = await trx.raw(
        'SELECT COALESCE(MAX(display_id), 0) + 1 AS next FROM "purchase_order"'
      )
      const displayId = Number(rows[0].next)

      await trx("purchase_order").insert({
        id,
        display_id: displayId,
        supplier_id: input.supplier_id,
        status: "draft",
        expected_date: input.expected_date ? new Date(input.expected_date) : null,
        notes: input.notes ?? null,
      })
    })

    const wms: WmsModuleService = container.resolve(WMS_MODULE)
    const purchaseOrder = await wms.retrievePurchaseOrder(id)

    return new StepResponse(purchaseOrder, id)
  },
  async (purchaseOrderId, { container }) => {
    if (!purchaseOrderId) return
    const wms: WmsModuleService = container.resolve(WMS_MODULE)
    await wms.deletePurchaseOrders(purchaseOrderId)
  }
)

/** Create the PO's lines (parent first — nested creates aren't typed). */
const createPurchaseOrderLinesStep = createStep(
  "create-purchase-order-lines",
  async (
    input: { purchase_order_id: string; lines: ResolvedLine[] },
    { container }
  ) => {
    if (!input.lines.length) {
      return new StepResponse([], [] as string[])
    }

    const wms: WmsModuleService = container.resolve(WMS_MODULE)
    const created = await wms.createPurchaseOrderLines(
      input.lines.map((line) => ({
        purchase_order_id: input.purchase_order_id,
        variant_id: line.variant_id,
        sku: line.sku,
        title: line.title,
        quantity_ordered: line.quantity_ordered,
      }))
    )
    const lines = Array.isArray(created) ? created : [created]

    return new StepResponse(
      lines,
      lines.map((l: any) => l.id)
    )
  },
  async (lineIds, { container }) => {
    if (!lineIds?.length) return
    const wms: WmsModuleService = container.resolve(WMS_MODULE)
    await wms.deletePurchaseOrderLines(lineIds)
  }
)

export const createPurchaseOrderWorkflow = createWorkflow(
  "create-purchase-order",
  function (input: CreatePurchaseOrderInput) {
    const lines = resolvePurchaseOrderLinesStep(input)
    const purchaseOrder = createPurchaseOrderRecordStep(input)

    const lineInput = transform({ purchaseOrder, lines }, (data) => ({
      purchase_order_id: data.purchaseOrder.id,
      lines: data.lines,
    }))
    createPurchaseOrderLinesStep(lineInput)

    return new WorkflowResponse(purchaseOrder)
  }
)

export default createPurchaseOrderWorkflow
