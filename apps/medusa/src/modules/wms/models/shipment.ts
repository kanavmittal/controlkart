import { model } from "@medusajs/framework/utils"

const Shipment = model.define("shipment", {
  id: model.id({ prefix: "wshp" }).primaryKey(),
  order_id: model.text().index("IDX_shipment_order_id"),
  shiprocket_order_id: model.text().nullable(),
  awb: model.text().index("IDX_shipment_awb").nullable(),
  label_url: model.text().nullable(),
  status: model
    .enum(["pending", "label_ready", "picked", "packed", "fulfilled", "cancelled"])
    .default("pending"),
  courier: model.text().nullable(),
  tracking_status: model.text().nullable(),
  /**
   * Server-persisted picking progress for this shipment (H6). Shape:
   * `{ serials: { [serial]: { variant_id, serial_unit_id, picked_at } },
   *    quantities: { [variant_id]: number } }`. Owned entirely by the wms
   * module — never mutates Medusa inventory/order state.
   */
  pick_state: model.json().nullable(),
})

export default Shipment
