import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SPECS_MODULE } from "../../../../../modules/specs"
import type SpecsModuleService from "../../../../../modules/specs/service"

type UpdateGroupBody = {
  name?: string
  code?: string
  display_order?: number
}

/** Updates a single spec group (POST is Medusa's update verb — no PUT/PATCH). */
export const POST = async (
  req: MedusaRequest<UpdateGroupBody>,
  res: MedusaResponse
) => {
  const specsService: SpecsModuleService = req.scope.resolve(SPECS_MODULE)
  const group = await specsService.updateSpecGroups({
    id: req.params.id,
    ...req.body,
  })
  res.json({ group })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const specsService: SpecsModuleService = req.scope.resolve(SPECS_MODULE)
  await specsService.deleteSpecGroups(req.params.id)
  res.json({ id: req.params.id, object: "spec_group", deleted: true })
}
