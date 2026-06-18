import { model } from "@medusajs/framework/utils"
import Quote from "./quote"

const QuoteItem = model.define("quote_item", {
  id: model.id({ prefix: "quoit" }).primaryKey(),
  quote: model.belongsTo(() => Quote, { mappedBy: "items" }),
  sku: model.text(),
  product_title: model.text().nullable(),
  variant_id: model.text().nullable(),
  quantity: model.number(),
  /** per-unit price quoted by admin, in minor units (paise) */
  quoted_unit_price: model.bigNumber().nullable(),
})

export default QuoteItem
