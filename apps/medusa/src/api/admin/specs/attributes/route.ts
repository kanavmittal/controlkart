import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SPECS_MODULE } from "../../../../modules/specs"
import type SpecsModuleService from "../../../../modules/specs/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const specsService: SpecsModuleService = req.scope.resolve(SPECS_MODULE)
  const attributes = await specsService.listSpecAttributes(
    {},
    { order: { display_order: "ASC" } }
  )
  res.json({ attributes })
}

type CreateAttributeBody = {
  name: string
  code: string
  group_code?: string
  unit?: string
  display_order?: number
  is_filterable?: boolean
  is_comparable?: boolean
}

export const POST = async (
  req: MedusaRequest<CreateAttributeBody>,
  res: MedusaResponse
) => {
  const specsService: SpecsModuleService = req.scope.resolve(SPECS_MODULE)
  const attribute = await specsService.createSpecAttributes(req.body)
  res.status(201).json({ attribute })
}
