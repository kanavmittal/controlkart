"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { HttpTypes } from "@medusajs/types"
import { sdk, CART_FIELDS } from "@/lib/sdk"
import { queryKeys } from "@/lib/query-keys"
import { clearCartId } from "@/lib/cart-store"
import { useCartId } from "@/components/providers/cart-provider"
import { useCart } from "@/lib/hooks/use-cart"
import { useCustomer } from "@/lib/hooks/use-customer"
import { useRegion } from "@/lib/hooks/use-region"
import type { CartAddressInput } from "@/lib/address-utils"

/**
 * Client-side checkout flow (CSR). Wraps the Medusa SDK address / shipping /
 * payment steps over the localStorage cart. The cart query (useCart) stays the
 * single source of truth — every mutation writes the returned cart back into
 * its cache so the step gating (hasAddress → hasShipping → payment) updates.
 */
export function useCheckout() {
  const { cart } = useCart()
  const { cartId } = useCartId()
  const { customer } = useCustomer()
  const { regionId } = useRegion()
  const queryClient = useQueryClient()

  const writeCart = (c: HttpTypes.StoreCart) =>
    queryClient.setQueryData(queryKeys.cart(c.id), c)
  const invalidateCart = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.cart(cartId) })

  // Step 1 — delivery / billing address + GSTIN + email
  const setCheckout = useMutation({
    mutationFn: async (v: {
      shipping: CartAddressInput
      billing: CartAddressInput
      gstin?: string
    }) => {
      if (!cartId) throw new Error("Your cart could not be found.")
      const { cart } = await sdk.store.cart.update(
        cartId,
        {
          email: customer?.email,
          shipping_address: v.shipping,
          billing_address: v.billing,
          metadata: { gstin: v.gstin },
        },
        { fields: CART_FIELDS }
      )
      return cart
    },
    onSuccess: (c) => {
      writeCart(c)
      invalidateCart()
    },
  })

  // Step 2 — shipping options for the address on the cart
  const shippingOptions = useQuery({
    queryKey: ["checkout", "shipping-options", cartId],
    enabled: !!cartId && !!cart?.shipping_address?.postal_code,
    staleTime: 30_000,
    queryFn: async () => {
      const { shipping_options } = await sdk.store.fulfillment.listCartOptions({
        cart_id: cartId!,
      })
      return shipping_options
    },
  })

  const setShipping = useMutation({
    mutationFn: async (optionId: string) => {
      if (!cartId) throw new Error("Your cart could not be found.")
      const { cart } = await sdk.store.cart.addShippingMethod(
        cartId,
        { option_id: optionId },
        { fields: CART_FIELDS }
      )
      return cart
    },
    onSuccess: (c) => {
      writeCart(c)
      invalidateCart()
    },
  })

  // Step 3 — initiate a payment session (Razorpay if configured, else default)
  async function initiatePayment() {
    if (!cart) throw new Error("Your cart could not be found.")
    const region_id = regionId ?? cart.region_id
    if (!region_id) throw new Error("No region is set on the cart.")
    const { payment_providers } = await sdk.store.payment.listPaymentProviders({
      region_id,
    })
    const razorpay = payment_providers.find((p) =>
      p.id.startsWith("pp_razorpay")
    )
    const providerId = razorpay?.id ?? "pp_system_default"
    const { payment_collection } =
      await sdk.store.payment.initiatePaymentSession(cart, {
        provider_id: providerId,
      })
    const session = payment_collection.payment_sessions?.find(
      (s) => s.provider_id === providerId
    )
    return {
      providerId,
      sessionData: (session?.data ?? {}) as Record<string, unknown>,
    }
  }

  // Finalize — complete the cart into an order, clear the local cart id
  async function complete() {
    if (!cartId) throw new Error("Your cart could not be found.")
    const result = await sdk.store.cart.complete(cartId)
    if (result.type === "order") {
      clearCartId()
      queryClient.removeQueries({ queryKey: queryKeys.cart(cartId) })
      return result.order
    }
    throw new Error(result.error?.message ?? "Failed to place the order.")
  }

  return {
    cart,
    cartId,
    customer,
    regionId,
    setCheckout,
    shippingOptions,
    setShipping,
    initiatePayment,
    complete,
  }
}
