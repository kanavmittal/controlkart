import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { z } from "zod"
import { WMS_MODULE } from "../../../../../modules/wms"
import type WmsModuleService from "../../../../../modules/wms/service"
import {
  BarcodeTemplateError,
  parseScan,
} from "../../../../../modules/wms/lib/barcode-template"
import { validateBody } from "../../../../../workflows/create-purchase-order"
import {
  computeProgress,
  getOrderItemsForPick,
  isFullyPicked,
  loadPickableShipment,
  normalizePickState,
  type OrderItemForPick,
} from "../../by-awb/[awb]/route"

const PickScanBodySchema = z.object({
  raw: z.string(),
})

/**
 * Resolves a scanned serial against serial_units belonging to variants on
 * this order (a serial is unique per-variant, not globally — see
 * SerialUnit's composite unique index). Tries `raw` verbatim first, then
 * (if no match) decodes `raw` against every supplier's barcode template and
 * tries each decoded serial the same way. Templates that throw while
 * decoding are skipped, not fatal.
 */
async function resolveOnOrderCandidates(
  wms: WmsModuleService,
  serialValue: string,
  orderVariantIds: string[]
) {
  return wms.listSerialUnits({
    serial: serialValue,
    variant_id: orderVariantIds,
  })
}

/**
 * Broader, unfiltered existence check used only to distinguish WRONG_ITEM
 * (the serial is real, just for a variant not on this order) from
 * SERIAL_NOT_IN_STOCK (the serial isn't a known unit at all).
 */
async function existsForAnyVariant(wms: WmsModuleService, serialValue: string) {
  const candidates = await wms.listSerialUnits({ serial: serialValue })
  return candidates.length > 0
}

async function decodeCandidateSerials(
  wms: WmsModuleService,
  raw: string
): Promise<string[]> {
  const suppliers = await wms.listSuppliers({})
  const decodedSerials: string[] = []

  for (const supplier of suppliers as any[]) {
    try {
      const decoded = parseScan(supplier.barcode_template, supplier.delimiter, raw)
      if (decoded.serial) {
        decodedSerials.push(decoded.serial)
      }
    } catch (error) {
      if (error instanceof BarcodeTemplateError) continue
      throw error
    }
  }

  return decodedSerials
}

function expectedRemaining(items: (OrderItemForPick & { picked: number })[]) {
  return items
    .filter((item) => item.picked < item.quantity)
    .map((item) => ({
      sku: item.sku,
      title: item.title,
      remaining: item.quantity - item.picked,
    }))
}

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { raw } = validateBody(PickScanBodySchema, req.body)
  const { id } = req.params

  const shipment = await loadPickableShipment(
    req.scope,
    { id },
    `Shipment "${id}" not found`
  )

  const wms: WmsModuleService = req.scope.resolve(WMS_MODULE)
  const items = await getOrderItemsForPick(req.scope, (shipment as any).order_id)
  const orderVariantIds = items.map((item) => item.variant_id)

  // Serial resolution: exact match first, then each supplier's decoded serial.
  const attemptedSerials = [raw, ...(await decodeCandidateSerials(wms, raw))]

  let unit: any = null
  for (const candidateSerial of attemptedSerials) {
    const [found] = await resolveOnOrderCandidates(
      wms,
      candidateSerial,
      orderVariantIds
    )
    if (found) {
      unit = found
      break
    }
  }

  const pickState = normalizePickState((shipment as any).pick_state)

  if (!unit) {
    let existsElsewhere = false
    for (const candidateSerial of attemptedSerials) {
      if (await existsForAnyVariant(wms, candidateSerial)) {
        existsElsewhere = true
        break
      }
    }

    if (existsElsewhere) {
      const progress = computeProgress(items, pickState)
      return res.json({
        verdict: "reject",
        code: "WRONG_ITEM",
        expected: expectedRemaining(progress),
      })
    }

    return res.json({ verdict: "reject", code: "SERIAL_NOT_IN_STOCK" })
  }

  if (unit.status !== "in_stock") {
    return res.json({ verdict: "reject", code: "SERIAL_NOT_IN_STOCK" })
  }

  if (pickState.serials[unit.serial]) {
    return res.json({ verdict: "reject", code: "ALREADY_PICKED" })
  }

  const progressBefore = computeProgress(items, pickState)
  const itemProgress = progressBefore.find(
    (item) => item.variant_id === unit.variant_id
  )
  if (!itemProgress || itemProgress.picked >= itemProgress.quantity) {
    return res.json({ verdict: "reject", code: "OVER_SCAN" })
  }

  const nextPickState = {
    serials: {
      ...pickState.serials,
      [unit.serial]: {
        variant_id: unit.variant_id,
        serial_unit_id: unit.id,
        picked_at: new Date().toISOString(),
      },
    },
    quantities: pickState.quantities,
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
