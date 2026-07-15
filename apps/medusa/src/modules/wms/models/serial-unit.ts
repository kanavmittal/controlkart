import { model } from "@medusajs/framework/utils"

const SerialUnit = model
  .define("serial_unit", {
    id: model.id({ prefix: "wser" }).primaryKey(),
    variant_id: model.text(),
    serial: model.text(),
    status: model.enum(["in_stock", "shipped", "removed"]).default("in_stock"),
    purchase_order_id: model.text().nullable(),
    /** set when shipped */
    order_id: model.text().nullable(),
    /** staff id */
    received_by: model.text().nullable(),
  })
  .indexes([
    {
      // serials are unique per variant, NOT globally
      name: "IDX_serial_unit_variant_id_serial",
      on: ["variant_id", "serial"],
      unique: true,
    },
  ])

export default SerialUnit
