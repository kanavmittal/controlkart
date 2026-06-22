import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { SPECS_MODULE } from "../../../../../modules/specs"
import type SpecsModuleService from "../../../../../modules/specs/service"

/** Parses the `filters` query param (URL-encoded JSON: { code: [values] }). */
function parseFilters(raw: unknown): Record<string, string[]> {
  if (typeof raw !== "string" || !raw) {
    return {}
  }
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") {
      return {}
    }
    const out: Record<string, string[]> = {}
    for (const [code, vals] of Object.entries(parsed)) {
      if (Array.isArray(vals)) {
        out[code] = vals.filter((v): v is string => typeof v === "string")
      }
    }
    return out
  } catch {
    return {}
  }
}

/**
 * Storefront spec facets for a category: every filterable attribute in the
 * category template with its distinct values + counts, plus the ids of the
 * products in the category that match the currently-selected filters.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const categoryId = req.params.id
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: categories } = await query.graph({
    entity: "product_category",
    fields: ["products.id", "products.status"],
    filters: { id: categoryId },
  })

  const products = (categories[0]?.products ?? []) as {
    id: string
    status: string
  }[]
  const productIds: string[] = products
    .filter((p) => p.status === "published")
    .map((p) => p.id)

  const specsService: SpecsModuleService = req.scope.resolve(SPECS_MODULE)
  const result = await specsService.getCategoryFacets(
    productIds,
    [categoryId],
    parseFilters(req.query.filters)
  )

  res.json(result)
}
