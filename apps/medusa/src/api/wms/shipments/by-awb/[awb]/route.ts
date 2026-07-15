import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { WMS_MODULE } from "../../../../../modules/wms"
import type WmsModuleService from "../../../../../modules/wms/service"

/* ========================================================================== *
 * Shared picking types/helpers (H6).                                        *
 *                                                                            *
 * Exported from this route module and imported by the pick-scan/pick-qty    *
 * POST routes so all three share one definition of "what does this order    *
 * still need" and "is this shipment fully picked" — pick_state itself is    *
 * plain wms-owned JSON on the shipment row, never Medusa inventory/order    *
 * state.                                                                    *
 * ========================================================================== */

/** Shipment statuses a picker is allowed to act on. */
export const PICKABLE_STATUSES = ["label_ready", "picked"]

export type PickState = {
  serials: Record<
    string,
    { variant_id: string; serial_unit_id: string; picked_at: string }
  >
  quantities: Record<string, number>
}

export function emptyPickState(): PickState {
  return { serials: {}, quantities: {} }
}

/** Defensively normalizes a possibly-null/partial pick_state read from the DB. */
export function normalizePickState(raw: unknown): PickState {
  const state = (raw ?? {}) as Partial<PickState>
  return {
    serials: state.serials ?? {},
    quantities: state.quantities ?? {},
  }
}

export type OrderItemForPick = {
  variant_id: string
  sku: string | null
  title: string
  quantity: number
  serialized: boolean
}

export type OrderItemProgress = OrderItemForPick & { picked: number }

/**
 * Loads the order's line items (via the WILDCARD `items.*` — listing dotted
 * fields like `items.quantity` explicitly silently drops `quantity`),
 * aggregates them per variant_id (an order can have more than one line item
 * for the same variant), and enriches each with the variant's `serialized`
 * metadata flag.
 */
export async function getOrderItemsForPick(
  scope: MedusaContainer,
  orderId: string
): Promise<OrderItemForPick[]> {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "items.*"],
    filters: { id: orderId },
  })
  const rawItems: any[] = (orders[0] as any)?.items ?? []

  const variantIds = Array.from(
    new Set(rawItems.map((item) => item.variant_id).filter(Boolean))
  )

  const variants = variantIds.length
    ? (
        await query.graph({
          entity: "variant",
          fields: ["id", "metadata"],
          filters: { id: variantIds },
        })
      ).data
    : []
  const serializedByVariant = new Map<string, boolean>(
    variants.map((v: any) => [v.id, v.metadata?.serialized === true])
  )

  const byVariant = new Map<string, OrderItemForPick>()
  for (const item of rawItems) {
    if (!item.variant_id) continue
    const quantity = Number(item.quantity)
    const existing = byVariant.get(item.variant_id)
    if (existing) {
      existing.quantity += quantity
      continue
    }
    byVariant.set(item.variant_id, {
      variant_id: item.variant_id,
      sku: item.variant_sku ?? null,
      title: item.title,
      quantity,
      serialized: serializedByVariant.get(item.variant_id) ?? false,
    })
  }

  return Array.from(byVariant.values())
}

/** Attaches per-item picked counts (serials counted, quantities read) from pick_state. */
export function computeProgress(
  items: OrderItemForPick[],
  pickState: PickState
): OrderItemProgress[] {
  return items.map((item) => {
    const picked = item.serialized
      ? Object.values(pickState.serials).filter(
          (s) => s.variant_id === item.variant_id
        ).length
      : pickState.quantities[item.variant_id] ?? 0
    return { ...item, picked }
  })
}

export function isFullyPicked(progress: OrderItemProgress[]): boolean {
  return progress.every((item) => item.picked >= item.quantity)
}

/** Loads a shipment by an arbitrary filter and 404s / 409s per H6's pickability rule. */
export async function loadPickableShipment(
  scope: MedusaContainer,
  filter: Record<string, unknown>,
  notFoundMessage: string
) {
  const wms: WmsModuleService = scope.resolve(WMS_MODULE)
  const [shipment] = await wms.listShipments(filter, { take: 1 })

  if (!shipment) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, notFoundMessage)
  }

  const status = (shipment as any).status
  if (!PICKABLE_STATUSES.includes(status)) {
    throw new MedusaError(
      MedusaError.Types.CONFLICT,
      `Shipment "${(shipment as any).id}" is not pickable (status: "${status}")`
    )
  }

  return shipment
}

/* ========================================================================== *
 * GET /wms/shipments/by-awb/:awb                                            *
 * ========================================================================== */

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { awb } = req.params

  const shipment = await loadPickableShipment(
    req.scope,
    { awb },
    `No shipment found for AWB "${awb}"`
  )

  const items = await getOrderItemsForPick(req.scope, (shipment as any).order_id)
  const pickState = normalizePickState((shipment as any).pick_state)
  const progress = computeProgress(items, pickState)

  return res.json({
    shipment,
    items: progress,
    all_picked: isFullyPicked(progress),
  })
}
