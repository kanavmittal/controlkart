import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SPECS_MODULE } from "../../../../../modules/specs"
import type SpecsModuleService from "../../../../../modules/specs/service"
import {
  getQuery,
  resolveCategoryLineage,
} from "../../../../../utils/category-hierarchy"

/**
 * Returns the category's own spec template rows (editable) plus the specs it
 * inherits from ancestor categories (read-only context, so merchants don't
 * redefine common specs that already cascade down from the parent).
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const specsService: SpecsModuleService = req.scope.resolve(SPECS_MODULE)
  const categoryId = req.params.id

  const templates = await specsService.listCategorySpecTemplates(
    { category_id: categoryId },
    { order: { display_order: "ASC" } }
  )

  const codes = templates.map((t) => t.attribute_code)
  const attributes = codes.length
    ? await specsService.listSpecAttributes({ code: codes })
    : []
  const attrByCode = new Map(attributes.map((a) => [a.code, a]))

  const rows = templates.map((t) => {
    const attr = attrByCode.get(t.attribute_code)
    return {
      id: t.id,
      attribute_code: t.attribute_code,
      name: attr?.name ?? t.attribute_code,
      group_code: attr?.group_code ?? "general",
      unit: attr?.unit ?? null,
      display_order: t.display_order,
      is_required: t.is_required,
    }
  })

  // Specs inherited from ancestor categories (excluding any this category
  // already defines itself).
  const query = getQuery(req.scope)
  const lineage = await resolveCategoryLineage(query, [categoryId])
  const ownCodes = new Set(codes)
  let inherited: {
    attribute_code: string
    name: string
    unit: string | null
    group: string
    is_required: boolean
    source_category: string | null
  }[] = []

  if (lineage.ancestorIds.length) {
    const ancestorAttrs = await specsService.getTemplateForCategories(
      lineage.ancestorIds
    )
    inherited = ancestorAttrs
      .filter((a) => !ownCodes.has(a.attribute_code))
      .map((a) => ({
        attribute_code: a.attribute_code,
        name: a.name,
        unit: a.unit,
        group: a.group,
        is_required: a.is_required,
        source_category:
          lineage.names.get(a.source_category_ids[0]) ?? null,
      }))
  }

  res.json({ templates: rows, inherited })
}

type UpsertTemplateBody = {
  attributes: {
    attribute_code: string
    display_order?: number
    is_required?: boolean
  }[]
}

/** Replaces the category's spec template with the provided set of attributes. */
export const POST = async (
  req: MedusaRequest<UpsertTemplateBody>,
  res: MedusaResponse
) => {
  const specsService: SpecsModuleService = req.scope.resolve(SPECS_MODULE)
  const categoryId = req.params.id

  const existing = await specsService.listCategorySpecTemplates({
    category_id: categoryId,
  })
  if (existing.length) {
    await specsService.deleteCategorySpecTemplates(existing.map((t) => t.id))
  }

  const templates = await specsService.createCategorySpecTemplates(
    req.body.attributes.map((a, i) => ({
      category_id: categoryId,
      attribute_code: a.attribute_code,
      display_order: a.display_order ?? i,
      is_required: a.is_required ?? false,
    }))
  )

  res.json({ templates })
}
