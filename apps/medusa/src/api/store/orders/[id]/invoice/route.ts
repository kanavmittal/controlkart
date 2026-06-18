import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"

/**
 * GST invoice data for an order. Splits the tax total into CGST/SGST for
 * intra-state shipments and IGST for inter-state, based on the company's
 * registered state.
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "created_at",
      "email",
      "currency_code",
      "item_total",
      "shipping_total",
      "tax_total",
      "total",
      "metadata",
      "customer_id",
      "items.*",
      "items.product.metadata",
      "shipping_address.*",
      "billing_address.*",
    ],
    filters: { id: req.params.id },
  })
  const order = orders[0]

  if (!order || order.customer_id !== req.auth_context.actor_id) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Order not found")
  }

  const companyState = (process.env.COMPANY_STATE || "Maharashtra")
    .trim()
    .toLowerCase()
  const shipState = (order.shipping_address?.province || "")
    .trim()
    .toLowerCase()
  const intraState = !!shipState && shipState === companyState

  const taxTotal = Number(order.tax_total ?? 0)
  const gst = intraState
    ? {
        type: "intra_state" as const,
        cgst: Number((taxTotal / 2).toFixed(2)),
        sgst: Number((taxTotal / 2).toFixed(2)),
        igst: 0,
      }
    : { type: "inter_state" as const, cgst: 0, sgst: 0, igst: taxTotal }

  res.json({
    invoice: {
      invoice_number: `CONTROLKART-${new Date(order.created_at as string).getFullYear()}-${order.display_id}`,
      order_id: order.id,
      display_id: order.display_id,
      date: order.created_at,
      seller: {
        name: "ControlKart",
        gstin: process.env.COMPANY_GSTIN || null,
        state: process.env.COMPANY_STATE || "Maharashtra",
      },
      buyer: {
        email: order.email,
        gstin: (order.metadata?.gstin as string) || null,
        billing_address: order.billing_address,
        shipping_address: order.shipping_address,
      },
      items: (order.items ?? []).map((item: any) => ({
        title: item.title,
        sku: item.variant_sku,
        hsn_code: item.product?.metadata?.hsn_code ?? "8537",
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
      })),
      totals: {
        item_total: order.item_total,
        shipping_total: order.shipping_total,
        tax_total: taxTotal,
        ...gst,
        grand_total: order.total,
        currency: order.currency_code,
      },
    },
  })
}
