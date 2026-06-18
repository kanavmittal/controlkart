import { model } from "@medusajs/framework/utils"

/**
 * A concrete spec value for a Medusa product (or a specific variant when
 * variant_id is set, e.g. "Supply Voltage: 24VDC" for one variant only).
 */
const SpecValue = model.define("spec_value", {
  id: model.id({ prefix: "spval" }).primaryKey(),
  product_id: model.text().index("IDX_spec_value_product_id"),
  variant_id: model.text().nullable(),
  attribute_code: model.text(),
  value: model.text(),
  /** numeric form for range filtering/sorting where applicable */
  normalized_value: model.float().nullable(),
})

export default SpecValue
