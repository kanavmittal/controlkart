import { defineLink } from "@medusajs/framework/utils"
import OrderModule from "@medusajs/medusa/order"
import WmsModule from "../modules/wms"

/**
 * Read-only link: shipment.order_id -> Order module's order.
 * No pivot table — Medusa resolves the linked order using the ID
 * already stored on shipment.order_id.
 */
export default defineLink(
  {
    linkable: WmsModule.linkable.shipment,
    field: "order_id",
  },
  OrderModule.linkable.order,
  {
    readOnly: true,
  }
)
