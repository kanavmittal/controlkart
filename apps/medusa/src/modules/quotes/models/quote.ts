import { model } from "@medusajs/framework/utils"
import QuoteItem from "./quote-item"

const Quote = model.define("quote", {
  id: model.id({ prefix: "quo" }).primaryKey(),
  status: model
    .enum([
      "requested",
      "under_review",
      "sent",
      "accepted",
      "rejected",
      "expired",
      "converted",
    ])
    .default("requested"),
  customer_id: model.text().index("IDX_quote_customer_id").nullable(),
  company_name: model.text(),
  gstin: model.text().nullable(),
  contact_name: model.text(),
  email: model.text(),
  phone: model.text(),
  pincode: model.text(),
  expected_date: model.dateTime().nullable(),
  notes: model.text().nullable(),
  admin_notes: model.text().nullable(),
  /** total quoted by admin, in minor units (paise) */
  quoted_total: model.bigNumber().nullable(),
  valid_until: model.dateTime().nullable(),
  converted_order_id: model.text().nullable(),
  items: model.hasMany(() => QuoteItem, { mappedBy: "quote" }),
})

export default Quote
