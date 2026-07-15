import { model } from "@medusajs/framework/utils"
import PurchaseOrder from "./purchase-order"

const PurchaseOrderLine = model.define("purchase_order_line", {
  id: model.id({ prefix: "wpol" }).primaryKey(),
  purchase_order: model.belongsTo(() => PurchaseOrder, { mappedBy: "lines" }),
  variant_id: model.text().index("IDX_purchase_order_line_variant_id"),
  /** snapshot at creation */
  sku: model.text(),
  /** snapshot at creation */
  title: model.text(),
  quantity_ordered: model.number(),
  quantity_received: model.number().default(0),
})

export default PurchaseOrderLine
