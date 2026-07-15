import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import WmsModule from "../modules/wms"

/**
 * Read-only link: serial_unit.variant_id -> Product module's variant.
 * No pivot table — Medusa resolves the linked variant using the ID
 * already stored on serial_unit.variant_id.
 */
export default defineLink(
  {
    linkable: WmsModule.linkable.serialUnit,
    field: "variant_id",
  },
  ProductModule.linkable.productVariant,
  {
    readOnly: true,
  }
)
