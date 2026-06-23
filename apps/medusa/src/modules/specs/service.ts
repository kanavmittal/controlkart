import { MedusaService } from "@medusajs/framework/utils"
import SpecGroup from "./models/spec-group"
import SpecAttribute from "./models/spec-attribute"
import SpecValue from "./models/spec-value"
import CategorySpecTemplate from "./models/category-spec-template"

class SpecsModuleService extends MedusaService({
  SpecGroup,
  SpecAttribute,
  SpecValue,
  CategorySpecTemplate,
}) {
  /**
   * Returns the fully-resolved spec table for a product: values joined with
   * attribute metadata and grouped, ready for storefront rendering.
   */
  async getProductSpecTable(productId: string, variantId?: string) {
    const values = await this.listSpecValues({ product_id: productId })
    const relevant = values.filter(
      (v) => !v.variant_id || v.variant_id === variantId
    )
    if (!relevant.length) {
      return []
    }

    const attributes = await this.listSpecAttributes({
      code: relevant.map((v) => v.attribute_code),
    })
    const attrByCode = new Map(attributes.map((a) => [a.code, a]))
    const groups = await this.listSpecGroups({})
    const groupByCode = new Map(groups.map((g) => [g.code, g]))

    return relevant
      .map((v) => {
        const attr = attrByCode.get(v.attribute_code)
        const group = attr ? groupByCode.get(attr.group_code) : undefined
        return {
          id: v.id,
          attribute: attr?.name ?? v.attribute_code,
          attribute_code: v.attribute_code,
          group: group?.name ?? "General",
          group_order: group?.display_order ?? 999,
          value: v.value,
          unit: attr?.unit ?? null,
          display_order: attr?.display_order ?? 999,
          is_filterable: attr?.is_filterable ?? false,
          is_comparable: attr?.is_comparable ?? true,
        }
      })
      .sort(
        (a, b) =>
          a.group_order - b.group_order || a.display_order - b.display_order
      )
  }

  /**
   * Resolves the spec fields a product should show, driven by the category
   * templates of the categories it belongs to (instead of the full global
   * attribute catalog). Attributes shared across the product's categories are
   * merged: required wins, lowest template order wins. Returns each attribute
   * joined with its group metadata, ordered for editing/display.
   */
  async getTemplateForCategories(categoryIds: string[]) {
    if (!categoryIds.length) {
      return []
    }

    const templates = await this.listCategorySpecTemplates({
      category_id: categoryIds,
    })
    if (!templates.length) {
      return []
    }

    const tmplByCode = new Map<
      string,
      { display_order: number; is_required: boolean; source: Set<string> }
    >()
    for (const t of templates) {
      const existing = tmplByCode.get(t.attribute_code)
      if (!existing) {
        tmplByCode.set(t.attribute_code, {
          display_order: t.display_order,
          is_required: t.is_required,
          source: new Set([t.category_id]),
        })
      } else {
        existing.display_order = Math.min(existing.display_order, t.display_order)
        existing.is_required = existing.is_required || t.is_required
        existing.source.add(t.category_id)
      }
    }

    const codes = [...tmplByCode.keys()]
    const attributes = await this.listSpecAttributes({ code: codes })
    const attrByCode = new Map(attributes.map((a) => [a.code, a]))
    const groups = await this.listSpecGroups({})
    const groupByCode = new Map(groups.map((g) => [g.code, g]))

    return codes
      .map((code) => {
        const attr = attrByCode.get(code)
        if (!attr) {
          return null
        }
        const group = groupByCode.get(attr.group_code)
        const tmpl = tmplByCode.get(code)!
        return {
          attribute_code: code,
          name: attr.name,
          group_code: attr.group_code,
          group: group?.name ?? "General",
          group_order: group?.display_order ?? 999,
          unit: attr.unit ?? null,
          display_order: attr.display_order ?? 0,
          template_order: tmpl.display_order,
          is_required: tmpl.is_required,
          is_filterable: attr.is_filterable,
          is_comparable: attr.is_comparable,
          /** category ids whose template contributed this attribute */
          source_category_ids: [...tmpl.source],
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort(
        (a, b) =>
          a.group_order - b.group_order ||
          a.template_order - b.template_order ||
          a.display_order - b.display_order
      )
  }

  /**
   * Builds the storefront spec facets for a set of products in a category:
   * for every filterable attribute that is part of the category template,
   * the distinct values with counts, plus the ids of the products that match
   * the currently-selected filters. Counts for each attribute reflect the
   * other selected filters (standard faceted behaviour); selecting values
   * within one attribute is OR, across attributes is AND.
   */
  async getCategoryFacets(
    productIds: string[],
    categoryIds: string[],
    selected: Record<string, string[]>
  ) {
    if (!productIds.length || !categoryIds.length) {
      return { facets: [], product_ids: productIds }
    }

    const templates = await this.listCategorySpecTemplates({
      category_id: categoryIds,
    })
    const tmplCodes = new Set(templates.map((t) => t.attribute_code))
    const attributes = (
      await this.listSpecAttributes({ is_filterable: true })
    ).filter((a) => tmplCodes.has(a.code))
    if (!attributes.length) {
      return { facets: [], product_ids: productIds }
    }

    const attrByCode = new Map(attributes.map((a) => [a.code, a]))
    const values = await this.listSpecValues({ product_id: productIds })

    // product_id -> (attribute_code -> value), product-level values only
    const byProduct = new Map<string, Map<string, string>>()
    for (const v of values) {
      if (v.variant_id || !attrByCode.has(v.attribute_code)) {
        continue
      }
      let m = byProduct.get(v.product_id)
      if (!m) {
        m = new Map()
        byProduct.set(v.product_id, m)
      }
      m.set(v.attribute_code, v.value)
    }

    const matchesSelection = (
      pid: string,
      selection: Record<string, string[]>
    ) => {
      const m = byProduct.get(pid)
      return Object.entries(selection).every(
        ([code, vals]) =>
          !vals.length || (m ? vals.includes(m.get(code) ?? "") : false)
      )
    }

    const matchedIds = productIds.filter((pid) =>
      matchesSelection(pid, selected)
    )

    const groups = await this.listSpecGroups({})
    const groupByCode = new Map(groups.map((g) => [g.code, g]))

    const facets = attributes
      .map((attr) => {
        const otherSelected = Object.fromEntries(
          Object.entries(selected).filter(([code]) => code !== attr.code)
        )
        const counts = new Map<string, number>()
        for (const pid of productIds) {
          if (!matchesSelection(pid, otherSelected)) {
            continue
          }
          const val = byProduct.get(pid)?.get(attr.code)
          if (!val) {
            continue
          }
          counts.set(val, (counts.get(val) ?? 0) + 1)
        }
        return {
          attribute_code: attr.code,
          name: attr.name,
          unit: attr.unit ?? null,
          group: groupByCode.get(attr.group_code)?.name ?? "General",
          values: [...counts.entries()]
            .map(([value, count]) => ({ value, count }))
            .sort((a, b) => a.value.localeCompare(b.value)),
        }
      })
      .filter((f) => f.values.length > 0)

    return { facets, product_ids: matchedIds }
  }

  /**
   * Orders the given product ids by a single spec attribute, numerically
   * (normalized_value, falling back to a parsed value). Products without a
   * usable value for that attribute are pushed to the end, preserving the
   * incoming order among themselves.
   */
  async sortProductIdsBySpec(
    productIds: string[],
    attributeCode: string,
    direction: "asc" | "desc"
  ): Promise<string[]> {
    if (!productIds.length) {
      return productIds
    }

    const values = await this.listSpecValues({
      product_id: productIds,
      attribute_code: attributeCode,
    })
    const byProduct = new Map<string, number>()
    for (const v of values) {
      if (v.variant_id) {
        continue
      }
      const n = v.normalized_value ?? parseFloat(v.value)
      if (typeof n === "number" && !Number.isNaN(n)) {
        byProduct.set(v.product_id, n)
      }
    }

    const sign = direction === "desc" ? -1 : 1
    const order = new Map(productIds.map((id, i) => [id, i]))
    return [...productIds].sort((a, b) => {
      const av = byProduct.get(a)
      const bv = byProduct.get(b)
      if (av === undefined && bv === undefined) {
        return (order.get(a) ?? 0) - (order.get(b) ?? 0)
      }
      if (av === undefined) {
        return 1
      }
      if (bv === undefined) {
        return -1
      }
      return (av - bv) * sign
    })
  }
}

export default SpecsModuleService
