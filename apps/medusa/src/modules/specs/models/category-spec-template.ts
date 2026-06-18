import { model } from "@medusajs/framework/utils"

/**
 * Controls which spec attributes (and in what order) products in a category
 * display. This is what makes the spec table per-category instead of
 * hardcoded for PLCs.
 */
const CategorySpecTemplate = model.define("category_spec_template", {
  id: model.id({ prefix: "sptpl" }).primaryKey(),
  category_id: model.text().index("IDX_spec_template_category_id"),
  attribute_code: model.text(),
  display_order: model.number().default(0),
  is_required: model.boolean().default(false),
})

export default CategorySpecTemplate
