import { model } from "@medusajs/framework/utils"

/**
 * A spec definition, e.g. "Supply Voltage", "Digital Inputs", "Mounting Type".
 * Attributes are reusable across categories via CategorySpecTemplate.
 */
const SpecAttribute = model.define("spec_attribute", {
  id: model.id({ prefix: "spattr" }).primaryKey(),
  name: model.text(),
  code: model.text().unique(),
  group_code: model.text().default("general"),
  unit: model.text().nullable(),
  display_order: model.number().default(0),
  is_filterable: model.boolean().default(false),
  is_comparable: model.boolean().default(true),
})

export default SpecAttribute
