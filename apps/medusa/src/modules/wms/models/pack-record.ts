import { model } from "@medusajs/framework/utils"

const PackRecord = model.define("pack_record", {
  id: model.id({ prefix: "wpck" }).primaryKey(),
  shipment_id: model.text().index("IDX_pack_record_shipment_id"),
  photo_file_id: model.text(),
  photo_url: model.text(),
  /** staff id */
  packed_by: model.text(),
  packed_at: model.dateTime(),
})

export default PackRecord
