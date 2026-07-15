import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { WMS_MODULE } from "../../../../../../modules/wms"
import type WmsModuleService from "../../../../../../modules/wms/service"
import {
  getTrackingForShipment,
  mapTrackingToStatus,
} from "../../../../../../modules/wms/lib/tracking-read"

/* ------------------------------- Types ------------------------------------ */

type PickedSerialEntry = {
  variant_id: string
  serial_unit_id: string
  picked_at: string
}

type StaffRef = { id: string; name: string | null }

type WarehouseItem = {
  variant_id: string
  sku: string | null
  title: string | null
  serials: {
    serial: string
    picked_at: string
    received_by: StaffRef | null
  }[]
}

type TimelineEvent = { at: string; event: string }

/* ------------------------------ Helpers ----------------------------------- */

/**
 * Resolve staff names for a set of staff ids in one read. Unknown ids map to
 * a null name (staff row deleted) rather than being dropped, so callers can
 * still show "who" by id.
 */
async function resolveStaffNames(
  wms: WmsModuleService,
  staffIds: string[]
): Promise<Map<string, string | null>> {
  const unique = [...new Set(staffIds.filter(Boolean))]
  const names = new Map<string, string | null>()
  if (!unique.length) {
    return names
  }
  const staff = await wms.listStaff({ id: unique })
  for (const id of unique) {
    names.set(id, null)
  }
  for (const s of staff as any[]) {
    names.set(s.id, s.name ?? null)
  }
  return names
}

function staffRef(
  id: string | null | undefined,
  names: Map<string, string | null>
): StaffRef | null {
  if (!id) {
    return null
  }
  return { id, name: names.get(id) ?? null }
}

function toIso(value: unknown): string | null {
  if (!value) {
    return null
  }
  if (value instanceof Date) {
    return value.toISOString()
  }
  const parsed = new Date(value as string)
  return isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

/* -------------------------------- Route ----------------------------------- */

/**
 * J1 — read-only warehouse status for one order, backing the admin
 * order-detail widget. Returns `{ shipment: null }` when the order has no
 * wms shipment (the widget renders nothing in that case). ZERO mutations.
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { order_id } = req.params

  const wms: WmsModuleService = req.scope.resolve(WMS_MODULE)

  const shipments = await wms.listShipments(
    { order_id },
    { order: { created_at: "DESC" } }
  )
  // Prefer the newest non-cancelled shipment (a cancelled one may have been
  // superseded); fall back to the newest overall so a fully-cancelled order
  // still shows its history.
  const shipment: any =
    (shipments as any[]).find((s) => s.status !== "cancelled") ??
    (shipments as any[])[0]

  if (!shipment) {
    return res.json({ shipment: null })
  }

  const pickState = (shipment.pick_state ?? {}) as {
    serials?: Record<string, PickedSerialEntry>
  }
  const pickedSerials = Object.entries(pickState.serials ?? {})

  // Serial units for the picked serials — needed for received_by staff.
  const serialUnitIds = pickedSerials.map(([, entry]) => entry.serial_unit_id)
  const serialUnits: any[] = serialUnitIds.length
    ? await wms.listSerialUnits({ id: serialUnitIds })
    : []
  const serialUnitById = new Map(serialUnits.map((u) => [u.id, u]))

  // Pack photo (one per shipment by construction — see pack-photo route).
  const [packRecord] = (await wms.listPackRecords(
    { shipment_id: shipment.id },
    { take: 1 }
  )) as any[]

  // Staff name resolution: pack photo's packed_by + each unit's received_by.
  const staffIds = [
    ...(packRecord?.packed_by ? [packRecord.packed_by] : []),
    ...serialUnits.map((u) => u.received_by).filter(Boolean),
  ]
  const staffNames = await resolveStaffNames(wms, staffIds)

  // Variant sku/title via Query (cross-module read).
  const variantIds = [
    ...new Set(pickedSerials.map(([, entry]) => entry.variant_id)),
  ]
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

  // Group picked serials per variant.
  const itemsByVariant = new Map<string, WarehouseItem>()
  for (const [serial, entry] of pickedSerials) {
    let item = itemsByVariant.get(entry.variant_id)
    if (!item) {
      const variant = variantById.get(entry.variant_id)
      item = {
        variant_id: entry.variant_id,
        sku: variant?.sku ?? null,
        title: variant?.title ?? null,
        serials: [],
      }
      itemsByVariant.set(entry.variant_id, item)
    }
    const unit = serialUnitById.get(entry.serial_unit_id)
    item.serials.push({
      serial,
      picked_at: entry.picked_at,
      received_by: staffRef(unit?.received_by, staffNames),
    })
  }
  const items = [...itemsByVariant.values()]
  for (const item of items) {
    item.serials.sort((a, b) => a.picked_at.localeCompare(b.picked_at))
  }

  // Tracking (read-only, degrades to null when plugin absent / no row yet).
  const trackingRow = await getTrackingForShipment(req.scope, shipment)
  const tracking = trackingRow
    ? {
        status: mapTrackingToStatus(trackingRow),
        raw_status:
          trackingRow.current_status ?? trackingRow.shipment_status ?? null,
        courier_name: trackingRow.courier_name ?? null,
      }
    : null

  // Timeline, derived from available data only.
  const timeline: TimelineEvent[] = []
  const createdAt = toIso(shipment.created_at)
  if (createdAt) {
    // Shipment rows are created by the label flow — creation ~ label ready.
    timeline.push({ at: createdAt, event: "label_ready" })
  }
  const pickedAts = pickedSerials
    .map(([, entry]) => entry.picked_at)
    .filter(Boolean)
    .sort()
  if (pickedAts.length) {
    timeline.push({ at: pickedAts[0], event: "picking_started" })
    if (["picked", "packed", "fulfilled"].includes(shipment.status)) {
      timeline.push({
        at: pickedAts[pickedAts.length - 1],
        event: "picking_completed",
      })
    }
  }
  const packedAt = toIso(packRecord?.packed_at)
  if (packedAt) {
    timeline.push({ at: packedAt, event: "packed" })
  }
  if (shipment.status === "fulfilled") {
    const fulfilledAt = toIso(shipment.updated_at)
    if (fulfilledAt) {
      timeline.push({ at: fulfilledAt, event: "fulfilled" })
    }
  }
  timeline.sort((a, b) => a.at.localeCompare(b.at))

  return res.json({
    shipment: {
      id: shipment.id,
      status: shipment.status,
      awb: shipment.awb ?? null,
      courier: shipment.courier ?? null,
      label_url: shipment.label_url ?? null,
      tracking,
      items,
      pack_photo: packRecord
        ? {
            photo_url: packRecord.photo_url,
            packed_at: toIso(packRecord.packed_at),
            packed_by: staffRef(packRecord.packed_by, staffNames),
          }
        : null,
      timeline,
    },
  })
}
