"use client"

import { useQuery } from "@tanstack/react-query"
import { sdk } from "@/lib/sdk"
import { queryKeys } from "@/lib/query-keys"

const ORDER_LIST_FIELDS =
  "id,display_id,status,total,currency_code,created_at,*items"
const ORDER_DETAIL_FIELDS =
  "id,display_id,status,created_at,updated_at,email,currency_code," +
  "item_total,item_subtotal,original_item_total,item_tax_total,shipping_total,shipping_tax_total," +
  "tax_total,discount_total,total,metadata," +
  "*items,*items.variant,*items.variant.product," +
  "*shipping_address,*billing_address,*shipping_methods,*fulfillments"

export function useOrders() {
  const q = useQuery({
    queryKey: queryKeys.orders,
    queryFn: async () => {
      try {
        const { orders } = await sdk.store.order.list({
          limit: 20,
          order: "-created_at",
          fields: ORDER_LIST_FIELDS,
        })
        return orders
      } catch {
        return []
      }
    },
    staleTime: 30_000,
    retry: false,
  })
  return { orders: q.data ?? [], isLoading: q.isLoading }
}

export function useOrder(id: string) {
  const q = useQuery({
    queryKey: queryKeys.order(id),
    enabled: !!id,
    queryFn: async () => {
      try {
        const { order } = await sdk.store.order.retrieve(id, {
          fields: ORDER_DETAIL_FIELDS,
        })
        return order
      } catch {
        return null
      }
    },
    retry: false,
  })
  return { order: q.data ?? null, isLoading: q.isLoading }
}
