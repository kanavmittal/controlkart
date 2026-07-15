import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { WMS_MODULE } from "../../../../../modules/wms"
import type WmsModuleService from "../../../../../modules/wms/service"
import {
  BarcodeTemplateError,
  validateTemplate,
} from "../../../../../modules/wms/lib/barcode-template"
import { normalizeDelimiter } from "../route"

type UpdateSupplierBody = {
  name?: string
  barcode_template?: string
  delimiter?: string | null
  notes?: string | null
}

const retrieveSupplierOrThrow = async (
  wms: WmsModuleService,
  id: string
) => {
  const [supplier] = await wms.listSuppliers({ id })
  if (!supplier) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Supplier with id "${id}" not found.`
    )
  }
  return supplier
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const wms: WmsModuleService = req.scope.resolve(WMS_MODULE)
  const supplier = await retrieveSupplierOrThrow(wms, req.params.id)
  res.json({ supplier })
}

/** Update (POST is Medusa's update verb — no PUT/PATCH). */
export const POST = async (
  req: MedusaRequest<UpdateSupplierBody>,
  res: MedusaResponse
) => {
  const wms: WmsModuleService = req.scope.resolve(WMS_MODULE)
  const existing = await retrieveSupplierOrThrow(wms, req.params.id)
  const body = req.body ?? {}

  // Validate the *effective* template/delimiter pair — a delimiter change
  // alone can invalidate an otherwise untouched template.
  const template =
    "barcode_template" in body && body.barcode_template !== undefined
      ? body.barcode_template
      : existing.barcode_template
  const delimiter =
    "delimiter" in body
      ? normalizeDelimiter(body.delimiter)
      : existing.delimiter

  try {
    validateTemplate(template, delimiter)
  } catch (e) {
    if (e instanceof BarcodeTemplateError) {
      res.status(400).json({ error: { code: e.code, message: e.message } })
      return
    }
    throw e
  }

  const supplier = await wms.updateSuppliers({
    id: existing.id,
    name: body.name ?? existing.name,
    barcode_template: template,
    delimiter,
    notes: "notes" in body ? body.notes ?? null : existing.notes,
  })

  res.json({ supplier })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const wms: WmsModuleService = req.scope.resolve(WMS_MODULE)
  await retrieveSupplierOrThrow(wms, req.params.id)
  await wms.deleteSuppliers(req.params.id)
  res.json({ id: req.params.id, object: "supplier", deleted: true })
}
