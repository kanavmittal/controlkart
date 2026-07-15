import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  BarcodeTemplateError,
  parseScan,
} from "../../../../../modules/wms/lib/barcode-template"
import { normalizeDelimiter } from "../route"

type PreviewScanBody = {
  template?: string
  delimiter?: string | null
  raw?: string
}

/**
 * Dry-run decode of a scan against a template — persists nothing. Powers the
 * "test a scan" box in the admin supplier drawer. Missing/empty fields fall
 * through to the parser, which reports them as typed errors
 * (TEMPLATE_INVALID / EMPTY_SCAN).
 */
export const POST = async (
  req: MedusaRequest<PreviewScanBody>,
  res: MedusaResponse
) => {
  const body = req.body ?? {}
  const template = typeof body.template === "string" ? body.template : ""
  const raw = typeof body.raw === "string" ? body.raw : ""
  const delimiter = normalizeDelimiter(body.delimiter)

  try {
    const result = parseScan(template, delimiter, raw)
    res.json(result)
  } catch (e) {
    if (e instanceof BarcodeTemplateError) {
      res.status(400).json({ error: { code: e.code, message: e.message } })
      return
    }
    throw e
  }
}
