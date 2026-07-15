import { model } from "@medusajs/framework/utils"

const PrintJob = model.define("print_job", {
  id: model.id({ prefix: "wprt" }).primaryKey(),
  shipment_id: model.text().nullable(),
  label_url: model.text(),
  status: model
    .enum(["pending", "released", "printing", "done", "failed"])
    .default("pending"),
  attempts: model.number().default(0),
  released_at: model.dateTime().nullable(),
  printed_at: model.dateTime().nullable(),
  error: model.text().nullable(),
})

export default PrintJob
