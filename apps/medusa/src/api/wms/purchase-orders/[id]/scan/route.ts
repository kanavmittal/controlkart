import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { z } from "zod"
import { WMS_MODULE } from "../../../../../modules/wms"
import type WmsModuleService from "../../../../../modules/wms/service"
import {
  BarcodeTemplateError,
  parseScan,
} from "../../../../../modules/wms/lib/barcode-template"
import {
  attachSuppliers,
  getPurchaseOrderWithLines,
  validateBody,
} from "../../../../../workflows/create-purchase-order"

const ScanBodySchema = z.object({
  raw: z.string(),
})

/**
 * Validate a single inbound scan against this PO's supplier barcode
 * template. STRICTLY READ-ONLY: this endpoint never writes serial_unit or
 * purchase_order rows. The warehouse app accumulates scans in a local
 * session; committing that batch (receiving quantities, persisting serial
 * units) is a separate task.
 *
 * Always responds 200 with a verdict object (except for the PO-not-open
 * case, which is a 409) — the app drives scanner feedback (beep/color) off
 * `verdict`/`code`, not off HTTP status.
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { raw } = validateBody(ScanBodySchema, req.body)
  const { id } = req.params

  const purchaseOrder = await getPurchaseOrderWithLines(req.scope, id)

  if (!["open", "partially_received"].includes(purchaseOrder.status)) {
    throw new MedusaError(
      MedusaError.Types.CONFLICT,
      `Purchase order "${id}" is not open for receiving (status: "${purchaseOrder.status}")`
    )
  }

  const [withSupplier] = await attachSuppliers(req.scope, [purchaseOrder])
  const supplier = withSupplier.supplier

  let decoded: { sku?: string; serial?: string }
  try {
    decoded = parseScan(supplier.barcode_template, supplier.delimiter, raw)
  } catch (error) {
    if (error instanceof BarcodeTemplateError) {
      return res.json({ verdict: "reject", code: error.code })
    }
    throw error
  }

  const line = (withSupplier.lines ?? []).find(
    (l: any) => l.sku === decoded.sku
  )
  if (!line) {
    return res.json({ verdict: "reject", code: "NOT_ON_PO" })
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: variants } = await query.graph({
    entity: "variant",
    fields: ["id", "metadata"],
    filters: { id: line.variant_id },
  })
  const serialized = variants[0]?.metadata?.serialized === true

  if (serialized) {
    const wms: WmsModuleService = req.scope.resolve(WMS_MODULE)
    const existing = await wms.listSerialUnits({
      variant_id: line.variant_id,
      serial: decoded.serial,
    })
    if (existing.length) {
      return res.json({ verdict: "reject", code: "SERIAL_EXISTS" })
    }
  }

  return res.json({
    verdict: "accept",
    variant_id: line.variant_id,
    sku: line.sku,
    serial: decoded.serial,
  })
}
