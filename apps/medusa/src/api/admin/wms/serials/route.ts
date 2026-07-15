import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { WMS_MODULE } from "../../../../modules/wms"
import type WmsModuleService from "../../../../modules/wms/service"

const SERIAL_STATUSES = ["in_stock", "shipped", "removed"] as const
type SerialStatus = (typeof SERIAL_STATUSES)[number]

const MAX_RESULTS = 100

/**
 * J1 — admin serial lookup. Read-only.
 *
 * Modes (at least one of `q` / `variant_id` is required):
 *  - `?q=<serial>`               exact-match serial search across variants
 *    (serials are unique per variant, not globally, so this can return
 *    multiple hits).
 *  - `?variant_id=<id>`          list units of one variant, optionally
 *    narrowed with `&status=in_stock` ("which units of SKU X are in stock").
 *    Both filters combine when `q` is also present.
 *
 * Each hit carries its variant (sku/title via Query), the purchase order's
 * display_id (if received against one), the order id (if shipped), the
 * receiving staff member's name, and created_at.
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : ""
  const variantId =
    typeof req.query.variant_id === "string" ? req.query.variant_id.trim() : ""
  const status = typeof req.query.status === "string" ? req.query.status : ""

  if (!q && !variantId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Provide `q` (exact serial) and/or `variant_id`"
    )
  }
  if (status && !SERIAL_STATUSES.includes(status as SerialStatus)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Invalid status "${status}" — expected one of: ${SERIAL_STATUSES.join(", ")}`
    )
  }

  const wms: WmsModuleService = req.scope.resolve(WMS_MODULE)

  const filters: Record<string, unknown> = {}
  if (q) {
    filters.serial = q
  }
  if (variantId) {
    filters.variant_id = variantId
  }
  if (status) {
    filters.status = status
  }

  const units = (await wms.listSerialUnits(filters, {
    take: MAX_RESULTS,
    order: { created_at: "DESC" },
  })) as any[]

  // Variant sku/title via Query (cross-module read).
  const variantIds = [...new Set(units.map((u) => u.variant_id))]
  const variantById = new Map<string, { sku: string | null; title: string | null }>()
  if (variantIds.length) {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data: variants } = await query.graph({
      entity: "variant",
      fields: ["id", "sku", "title", "product.title"],
      filters: { id: variantIds },
    })
    for (const variant of variants as any[]) {
      variantById.set(variant.id, {
        sku: variant.sku ?? null,
        title: variant.title ?? variant.product?.title ?? null,
      })
    }
  }

  // Purchase order display_ids.
  const purchaseOrderIds = [
    ...new Set(units.map((u) => u.purchase_order_id).filter(Boolean)),
  ] as string[]
  const purchaseOrderById = new Map<string, { id: string; display_id: number }>()
  if (purchaseOrderIds.length) {
    const purchaseOrders = (await wms.listPurchaseOrders({
      id: purchaseOrderIds,
    })) as any[]
    for (const po of purchaseOrders) {
      purchaseOrderById.set(po.id, { id: po.id, display_id: po.display_id })
    }
  }

  // Receiving staff names.
  const staffIds = [
    ...new Set(units.map((u) => u.received_by).filter(Boolean)),
  ] as string[]
  const staffById = new Map<string, { id: string; name: string | null }>()
  if (staffIds.length) {
    const staff = (await wms.listStaff({ id: staffIds })) as any[]
    for (const s of staff) {
      staffById.set(s.id, { id: s.id, name: s.name ?? null })
    }
  }

  const serials = units.map((unit) => {
    const variant = variantById.get(unit.variant_id)
    return {
      id: unit.id,
      serial: unit.serial,
      status: unit.status,
      variant: {
        id: unit.variant_id,
        sku: variant?.sku ?? null,
        title: variant?.title ?? null,
      },
      purchase_order: unit.purchase_order_id
        ? purchaseOrderById.get(unit.purchase_order_id) ?? {
            id: unit.purchase_order_id,
            display_id: null,
          }
        : null,
      order_id: unit.status === "shipped" ? unit.order_id ?? null : null,
      received_by: unit.received_by
        ? staffById.get(unit.received_by) ?? { id: unit.received_by, name: null }
        : null,
      created_at: unit.created_at,
    }
  })

  return res.json({ serials, count: serials.length })
}
