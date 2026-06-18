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
}

export default SpecsModuleService
