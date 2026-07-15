import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { WMS_MODULE } from "../../../../modules/wms"
import type WmsModuleService from "../../../../modules/wms/service"
import {
  BarcodeTemplateError,
  validateTemplate,
} from "../../../../modules/wms/lib/barcode-template"

type CreateSupplierBody = {
  name?: string
  barcode_template?: string
  delimiter?: string | null
  notes?: string | null
}

/** "" and undefined both mean "no delimiter" — store as null. */
export const normalizeDelimiter = (
  delimiter: string | null | undefined
): string | null =>
  delimiter === undefined || delimiter === null || delimiter === ""
    ? null
    : delimiter

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const wms: WmsModuleService = req.scope.resolve(WMS_MODULE)

  const limit = Math.min(Number(req.query.limit) || 50, 100)
  const offset = Number(req.query.offset) || 0

  const [suppliers, count] = await wms.listAndCountSuppliers(
    {},
    { order: { created_at: "DESC" }, take: limit, skip: offset }
  )

  res.json({ suppliers, count, limit, offset })
}

export const POST = async (
  req: MedusaRequest<CreateSupplierBody>,
  res: MedusaResponse
) => {
  const wms: WmsModuleService = req.scope.resolve(WMS_MODULE)
  const { name, barcode_template, notes } = req.body ?? {}

  if (!name || typeof name !== "string") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Supplier `name` is required."
    )
  }
  if (!barcode_template || typeof barcode_template !== "string") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Supplier `barcode_template` is required."
    )
  }

  const delimiter = normalizeDelimiter(req.body?.delimiter)

  try {
    validateTemplate(barcode_template, delimiter)
  } catch (e) {
    if (e instanceof BarcodeTemplateError) {
      res.status(400).json({ error: { code: e.code, message: e.message } })
      return
    }
    throw e
  }

  const supplier = await wms.createSuppliers({
    name,
    barcode_template,
    delimiter,
    notes: notes ?? null,
  })

  res.status(201).json({ supplier })
}
