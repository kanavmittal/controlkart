import { model } from "@medusajs/framework/utils"

const Supplier = model.define("supplier", {
  id: model.id({ prefix: "wsup" }).primaryKey(),
  name: model.text(),
  /** e.g. "{sku}|{serial}" */
  barcode_template: model.text(),
  /** the character separating template segments */
  delimiter: model.text().nullable(),
  notes: model.text().nullable(),
})

export default Supplier
