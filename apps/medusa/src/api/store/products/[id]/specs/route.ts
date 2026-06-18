import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SPECS_MODULE } from "../../../../../modules/specs"
import type SpecsModuleService from "../../../../../modules/specs/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const specsService: SpecsModuleService = req.scope.resolve(SPECS_MODULE)
  const specs = await specsService.getProductSpecTable(
    req.params.id,
    req.query.variant_id as string | undefined
  )
  res.json({ specs })
}
