import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SPECS_MODULE } from "../../../../../modules/specs"
import type SpecsModuleService from "../../../../../modules/specs/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const specsService: SpecsModuleService = req.scope.resolve(SPECS_MODULE)
  const values = await specsService.listSpecValues({
    product_id: req.params.id,
  })
  res.json({ values })
}

type UpsertSpecsBody = {
  values: {
    attribute_code: string
    value: string
    variant_id?: string | null
    normalized_value?: number | null
  }[]
}

/** Replaces the product's spec values with the provided set. */
export const POST = async (
  req: MedusaRequest<UpsertSpecsBody>,
  res: MedusaResponse
) => {
  const specsService: SpecsModuleService = req.scope.resolve(SPECS_MODULE)
  const productId = req.params.id

  const existing = await specsService.listSpecValues({ product_id: productId })
  if (existing.length) {
    await specsService.deleteSpecValues(existing.map((v) => v.id))
  }

  const values = await specsService.createSpecValues(
    req.body.values.map((v) => ({
      product_id: productId,
      attribute_code: v.attribute_code,
      value: v.value,
      variant_id: v.variant_id ?? null,
      normalized_value: v.normalized_value ?? null,
    }))
  )
  res.json({ values })
}
