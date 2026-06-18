import { HttpTypes } from "@medusajs/types"
import { storeFetch } from "../medusa"
import { authHeaders } from "./cookies"

const ORDER_LIST_FIELDS =
  "id,display_id,status,total,currency_code,created_at,*items"

const ORDER_DETAIL_FIELDS =
  "id,display_id,status,created_at,updated_at,email,currency_code," +
  "item_total,item_subtotal,item_tax_total,shipping_total,shipping_tax_total," +
  "tax_total,discount_total,total,metadata," +
  "*items,*items.variant,*items.variant.product," +
  "*shipping_address,*billing_address,*shipping_methods,*fulfillments"

export async function listOrders(): Promise<HttpTypes.StoreOrder[]> {
  try {
    const { orders } = await storeFetch<{ orders: HttpTypes.StoreOrder[] }>(
      "/store/orders",
      {
        query: {
          fields: ORDER_LIST_FIELDS,
          limit: 20,
          order: "-created_at",
        },
        headers: await authHeaders(),
        cache: "no-store",
      }
    )
    return orders
  } catch {
    return []
  }
}

export async function getOrder(
  id: string
): Promise<HttpTypes.StoreOrder | null> {
  try {
    const { order } = await storeFetch<{ order: HttpTypes.StoreOrder }>(
      `/store/orders/${id}`,
      {
        query: { fields: ORDER_DETAIL_FIELDS },
        headers: await authHeaders(),
        cache: "no-store",
      }
    )
    return order
  } catch {
    return null
  }
}

export function formatOrderStatus(status: string | undefined): string {
  if (!status) return "Unknown"
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export function orderStatusTone(
  status: string | undefined
): "ok" | "warn" | "bad" | "muted" {
  switch (status) {
    case "completed":
    case "delivered":
      return "ok"
    case "canceled":
    case "cancelled":
      return "bad"
    case "pending":
    case "requires_action":
      return "warn"
    default:
      return "muted"
  }
}
