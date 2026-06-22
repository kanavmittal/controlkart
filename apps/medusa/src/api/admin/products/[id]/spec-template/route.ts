import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { SPECS_MODULE } from "../../../../../modules/specs"
import type SpecsModuleService from "../../../../../modules/specs/service"

/**
 * Returns the spec fields a product should display, driven by the category
 * templates of the categories the product belongs to. The admin widget uses
 * this instead of the full global attribute catalog so each product only shows
 * the specs relevant to its category.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "categories.id"],
    filters: { id: req.params.id },
  })

  const product = products[0] as
    | { categories?: { id: string }[] }
    | undefined
  const categoryIds: string[] = (product?.categories ?? [])
    .map((c) => c.id)
    .filter(Boolean)

  const specsService: SpecsModuleService = req.scope.resolve(SPECS_MODULE)
  const attributes = await specsService.getTemplateForCategories(categoryIds)

  res.json({ attributes })
}
