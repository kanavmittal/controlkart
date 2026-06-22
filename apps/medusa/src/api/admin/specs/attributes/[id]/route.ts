import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SPECS_MODULE } from "../../../../../modules/specs"
import type SpecsModuleService from "../../../../../modules/specs/service"

type UpdateAttributeBody = {
  name?: string
  code?: string
  group_code?: string
  unit?: string | null
  display_order?: number
  is_filterable?: boolean
  is_comparable?: boolean
}

/** Updates a single spec attribute (POST is Medusa's update verb — no PUT/PATCH). */
export const POST = async (
  req: MedusaRequest<UpdateAttributeBody>,
  res: MedusaResponse
) => {
  const specsService: SpecsModuleService = req.scope.resolve(SPECS_MODULE)
  const attribute = await specsService.updateSpecAttributes({
    id: req.params.id,
    ...req.body,
  })
  res.json({ attribute })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const specsService: SpecsModuleService = req.scope.resolve(SPECS_MODULE)
  await specsService.deleteSpecAttributes(req.params.id)
  res.json({ id: req.params.id, object: "spec_attribute", deleted: true })
}
