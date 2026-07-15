import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { WMS_MODULE } from "../../../../../../modules/wms"
import type WmsModuleService from "../../../../../../modules/wms/service"

/**
 * Reprint = clone the source job as a brand-new `pending` print_job (same
 * label_url + shipment_id, attempts reset to 0). The original row is never
 * mutated — it stays behind as the audit trail of what actually happened.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const wms: WmsModuleService = req.scope.resolve(WMS_MODULE)
  const { id } = req.params

  const [source] = await wms.listPrintJobs({ id })
  if (!source) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Print job "${id}" was not found.`
    )
  }

  if (!source.label_url) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Print job "${id}" has no label_url — nothing to reprint.`
    )
  }

  // New row relies on the model defaults: status "pending", attempts 0.
  const job = await wms.createPrintJobs({
    shipment_id: source.shipment_id,
    label_url: source.label_url,
  })

  res.status(201).json({ job })
}
