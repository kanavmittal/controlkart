import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SPECS_MODULE } from "../../../../../modules/specs"
import type SpecsModuleService from "../../../../../modules/specs/service"
import {
  getQuery,
  resolveCategoryLineage,
} from "../../../../../utils/category-hierarchy"

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
 * Storefront spec facets for a category, hierarchy-aware:
 *  - products are aggregated across the category AND all its descendants
 *    (so the parent "PLCs" page covers every sub-category's products), and
 *  - the filterable/sortable attributes come from the category's RESOLVED
 *    template (its own + everything inherited from ancestors).
 *
 * Returns the facets, the product ids matching the selected filters (sorted
 * when `sort=<code>:asc|desc` is given), and the list of sortable attributes.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const categoryId = req.params.id
  const query = getQuery(req.scope)

  // 1. Resolve self + descendants via mpath (one category's mpath is a prefix
  //    of all its descendants').
  const { data: selfCats } = await query.graph({
    entity: "product_category",
    fields: ["id", "mpath"],
    filters: { id: categoryId },
  })
  const mpath = (selfCats[0]?.mpath as string | null) ?? null

  let categoryIds: string[] = [categoryId]
  if (mpath) {
    const { data: descendants } = await query.graph({
      entity: "product_category",
      fields: ["id"],
      filters: { mpath: { $like: `${mpath}%` } },
    })
    categoryIds = [
      ...new Set([categoryId, ...descendants.map((c) => c.id as string)]),
    ]
  }

  // 2. Published product ids across those categories.
  const { data: prodCats } = await query.graph({
    entity: "product_category",
    fields: ["products.id", "products.status"],
    filters: { id: categoryIds },
  })
  const productIds = [
    ...new Set(
      prodCats.flatMap((c) =>
        ((c.products ?? []) as { id: string; status: string }[])
          .filter((p) => p.status === "published")
          .map((p) => p.id)
      )
    ),
  ]

  // 3. Which attributes are filterable/sortable for this page = the union of
  //    the resolved template (self + ancestors, for inherited specs) AND every
  //    descendant's template (so a parent page surfaces the leaf-specific specs
  //    its aggregated products carry, e.g. "slots" on a PLCs page).
  const lineage = await resolveCategoryLineage(query, [categoryId])
  const templateCategoryIds = [...new Set([...lineage.allIds, ...categoryIds])]
  const specsService: SpecsModuleService = req.scope.resolve(SPECS_MODULE)

  const { facets, product_ids } = await specsService.getCategoryFacets(
    productIds,
    templateCategoryIds,
    parseFilters(req.query.filters)
  )

  // 4. Optional spec sort of the matched ids.
  let ordered = product_ids
  const sort = req.query.sort
  if (typeof sort === "string" && sort.includes(":")) {
    const [code, dir] = sort.split(":")
    if (code) {
      ordered = await specsService.sortProductIdsBySpec(
        product_ids,
        code,
        dir === "desc" ? "desc" : "asc"
      )
    }
  }

  // 5. Sortable attributes = comparable attributes across the same template set.
  const template = await specsService.getTemplateForCategories(
    templateCategoryIds
  )
  const sortable = template
    .filter((a) => a.is_comparable)
    .map((a) => ({ attribute_code: a.attribute_code, name: a.name, unit: a.unit }))

  res.json({ facets, product_ids: ordered, sortable })
}
