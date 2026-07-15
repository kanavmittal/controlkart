import { model } from "@medusajs/framework/utils"
import PurchaseOrderLine from "./purchase-order-line"

const PurchaseOrder = model.define("purchase_order", {
  id: model.id({ prefix: "wpo" }).primaryKey(),
  /** sequential; assignment logic comes in a later task */
  display_id: model.number(),
  supplier_id: model.text().index("IDX_purchase_order_supplier_id"),
  status: model
    .enum(["draft", "open", "partially_received", "received", "cancelled"])
    .default("draft"),
  expected_date: model.dateTime().nullable(),
  notes: model.text().nullable(),
  metadata: model.json().nullable(),
  lines: model.hasMany(() => PurchaseOrderLine, { mappedBy: "purchase_order" }),
})

export default PurchaseOrder
