import { model } from "@medusajs/framework/utils"

/** Downloadable asset (datasheet, manual, CAD, certificate) attached to a product. */
const ProductDocument = model.define("product_document", {
  id: model.id({ prefix: "pdoc" }).primaryKey(),
  product_id: model.text().index("IDX_product_document_product_id"),
  title: model.text(),
  type: model
    .enum(["datasheet", "manual", "cad", "certificate", "other"])
    .default("datasheet"),
  file_url: model.text(),
  file_size: model.number().nullable(),
  display_order: model.number().default(0),
})

export default ProductDocument
