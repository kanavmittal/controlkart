import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { attachSuppliers } from "../../../workflows/create-purchase-order"

/**
 * Warehouse-app-facing PO list: only POs currently receivable (open /
 * partially_received), newest first, with supplier name and per-line
 * received/ordered counts.
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data } = await query.graph({
    entity: "purchase_order",
    fields: [
      "id",
      "display_id",
      "supplier_id",
      "status",
      "expected_date",
      "notes",
      "lines.id",
      "lines.variant_id",
      "lines.sku",
      "lines.title",
      "lines.quantity_ordered",
      "lines.quantity_received",
    ],
    filters: { status: ["open", "partially_received"] },
    pagination: {
      order: { display_id: "DESC" },
      take: 200,
    },
  })

  const purchase_orders = await attachSuppliers(req.scope, data as any[])

  res.json({ purchase_orders })
}
