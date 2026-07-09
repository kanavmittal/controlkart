"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { HttpTypes } from "@medusajs/types"
import { sdk, CART_FIELDS } from "@/lib/sdk"
import { queryKeys, DYNAMIC_QUERY_OPTIONS } from "@/lib/query-keys"
import { getOrCreateCartId } from "@/lib/cart-store"
import { useCartId } from "@/components/providers/cart-provider"
import { useRegion } from "./use-region"

/**
 * Client-side cart (CSR). The cart is public — only the publishable key and the
 * localStorage cart id are needed. add is fast (invalidate); qty change / remove
 * are optimistic with rollback.
 */
export function useCart() {
  const { cartId, setCartId } = useCartId()
  const { regionId } = useRegion()
  const queryClient = useQueryClient()
  const key = queryKeys.cart(cartId)

  const cartQuery = useQuery({
    queryKey: key,
    enabled: !!cartId,
    queryFn: async () => {
      const { cart } = await sdk.store.cart.retrieve(cartId!, {
        fields: CART_FIELDS,
      })
      return cart
    },
    ...DYNAMIC_QUERY_OPTIONS,
  })

  const cart = cartQuery.data ?? null
  const itemCount =
    cart?.items?.reduce((n, i) => n + (i.quantity ?? 0), 0) ?? 0

  const writeCart = (c: HttpTypes.StoreCart) =>
    queryClient.setQueryData(queryKeys.cart(c.id), c)

  const addItem = useMutation({
    mutationFn: async (vars: { variantId: string; quantity: number }) => {
      const id = await getOrCreateCartId(regionId)
      if (id !== cartId) setCartId(id)
      const { cart } = await sdk.store.cart.createLineItem(id, {
        variant_id: vars.variantId,
        quantity: vars.quantity,
      })
      return cart
    },
    onSuccess: (c) => {
      writeCart(c)
      queryClient.invalidateQueries({ queryKey: ["cart"] })
    },
  })

  // quantity <= 0 removes the line. Optimistic + rollback.
  const updateItem = useMutation({
    mutationFn: async (vars: { lineId: string; quantity: number }) => {
      if (!cartId) return null
      if (vars.quantity <= 0) {
        const { parent } = await sdk.store.cart.deleteLineItem(
          cartId,
          vars.lineId
        )
        return parent as HttpTypes.StoreCart
      }
      const { cart } = await sdk.store.cart.updateLineItem(cartId, vars.lineId, {
        quantity: vars.quantity,
      })
      return cart
    },
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: key })
      const prev = queryClient.getQueryData<HttpTypes.StoreCart>(key)
      if (prev) {
        const items = (prev.items ?? [])
          .map((i) =>
            i.id === vars.lineId ? { ...i, quantity: vars.quantity } : i
          )
          .filter((i) => (i.quantity ?? 0) > 0)
        queryClient.setQueryData(key, { ...prev, items })
      }
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(key, ctx.prev)
    },
    onSuccess: (c) => {
      if (c) writeCart(c)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  // Apply a promotion/coupon code. `sdk.store.cart.addPromotions` — verified
  // against the installed @medusajs/js-sdk 2.15.3 types
  // (dist/store/index.d.ts): `addPromotions(cartId, { promo_codes }, query?,
  // headers?) => Promise<StoreCartResponse>`. Invalidate on success (no
  // optimistic update — totals depend on server-side promotion evaluation).
  const applyPromoCode = useMutation({
    mutationFn: async (code: string) => {
      if (!cartId) throw new Error("Your cart could not be found.")
      const { cart } = await sdk.store.cart.addPromotions(cartId, {
        promo_codes: [code],
      })
      return cart
    },
    onSuccess: (c) => writeCart(c),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  // Remove a previously-applied promotion/coupon code.
  // `sdk.store.cart.removePromotions` — same source as above.
  const removePromoCode = useMutation({
    mutationFn: async (code: string) => {
      if (!cartId) throw new Error("Your cart could not be found.")
      const { cart } = await sdk.store.cart.removePromotions(cartId, {
        promo_codes: [code],
      })
      return cart
    },
    onSuccess: (c) => writeCart(c),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  return {
    cart,
    itemCount,
    isLoading: cartQuery.isLoading && !!cartId,
    isError: cartQuery.isError,
    addItem,
    updateItem,
    applyPromoCode,
    removePromoCode,
  }
}
