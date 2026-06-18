import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SPECS_MODULE } from "../../../../modules/specs"
import type SpecsModuleService from "../../../../modules/specs/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const specsService: SpecsModuleService = req.scope.resolve(SPECS_MODULE)
  const groups = await specsService.listSpecGroups(
    {},
    { order: { display_order: "ASC" } }
  )
  res.json({ groups })
}

type CreateGroupBody = { name: string; code: string; display_order?: number }

export const POST = async (
  req: MedusaRequest<CreateGroupBody>,
  res: MedusaResponse
) => {
  const specsService: SpecsModuleService = req.scope.resolve(SPECS_MODULE)
  const group = await specsService.createSpecGroups(req.body)
  res.status(201).json({ group })
}
