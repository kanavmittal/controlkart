import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SPECS_MODULE } from "../../../../../modules/specs"
import type SpecsModuleService from "../../../../../modules/specs/service"
import {
  getQuery,
  resolveCategoryLineage,
} from "../../../../../utils/category-hierarchy"

/**
 * Returns the spec fields a product should display, driven by the category
 * templates of the categories the product belongs to AND every ancestor of
 * those categories (so a product in "Wall-mounted PLCs" inherits the common
 * specs defined on "PLCs"). Each attribute is flagged `inherited` when it comes
 * only from an ancestor category, with the originating category name.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = getQuery(req.scope)
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "categories.id"],
    filters: { id: req.params.id },
  })

  const product = products[0] as { categories?: { id: string }[] } | undefined
  const ownIds = (product?.categories ?? [])
    .map((c) => c.id)
    .filter(Boolean)

  const lineage = await resolveCategoryLineage(query, ownIds)

  const specsService: SpecsModuleService = req.scope.resolve(SPECS_MODULE)
  const attributes = await specsService.getTemplateForCategories(lineage.allIds)

  const ownSet = new Set(lineage.ownIds)
  const result = attributes.map((a) => {
    const fromOwn = a.source_category_ids.some((id) => ownSet.has(id))
    const ancestorSource = a.source_category_ids.find((id) => !ownSet.has(id))
    return {
      ...a,
      inherited: !fromOwn,
      source_category:
        !fromOwn && ancestorSource
          ? lineage.names.get(ancestorSource) ?? null
          : null,
    }
  })

  res.json({ attributes: result })
}
