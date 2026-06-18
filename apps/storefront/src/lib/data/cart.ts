"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { HttpTypes } from "@medusajs/types"
import { storeFetch } from "../medusa"
import { getRegionId } from "./products"
import {
  getCartId,
  setCartId,
  removeCartId,
  authHeaders,
} from "./cookies"
import { getCustomer } from "./auth"
import {
  resolveCheckoutAddresses,
  persistCheckoutAddresses,
} from "./addresses"

const CART_FIELDS =
  "*items,*items.variant,*items.variant.product,*shipping_methods,*shipping_address,*billing_address,*payment_collection,*payment_collection.payment_sessions"

export async function retrieveCart(): Promise<HttpTypes.StoreCart | null> {
  const cartId = await getCartId()
  if (!cartId) return null
  try {
    const { cart } = await storeFetch<{ cart: HttpTypes.StoreCart }>(
      `/store/carts/${cartId}`,
      { query: { fields: CART_FIELDS }, revalidate: false }
    )
    return cart
  } catch {
    await removeCartId()
    return null
  }
}

async function getOrCreateCartId(): Promise<string> {
  const existing = await getCartId()
  if (existing) return existing

  const { cart } = await storeFetch<{ cart: HttpTypes.StoreCart }>(
    "/store/carts",
    {
      method: "POST",
      body: { region_id: await getRegionId() },
      headers: await authHeaders(),
    }
  )
  await setCartId(cart.id)
  return cart.id
}

export async function addToCart(variantId: string, quantity: number) {
  const cartId = await getOrCreateCartId()
  await storeFetch(`/store/carts/${cartId}/line-items`, {
    method: "POST",
    body: { variant_id: variantId, quantity },
  })
  revalidatePath("/cart")
}

export async function updateLineItem(lineId: string, quantity: number) {
  const cartId = await getCartId()
  if (!cartId) return
  if (quantity <= 0) {
    await storeFetch(`/store/carts/${cartId}/line-items/${lineId}`, {
      method: "DELETE",
    })
  } else {
    await storeFetch(`/store/carts/${cartId}/line-items/${lineId}`, {
      method: "POST",
      body: { quantity },
    })
  }
  revalidatePath("/cart")
}

export async function setCheckoutDetails(formData: FormData) {
  const cartId = await getCartId()
  if (!cartId) redirect("/cart")

  const customer = await getCustomer()
  if (!customer) redirect("/account?redirect=/checkout")

  const billingSame = formData.get("billing_same_as_shipping") === "on"

  let resolved
  try {
    resolved = await resolveCheckoutAddresses(formData)
  } catch (e) {
    throw e instanceof Error ? e : new Error("Invalid address")
  }

  await storeFetch(`/store/carts/${cartId}`, {
    method: "POST",
    body: {
      email: customer.email,
      shipping_address: resolved.shipping,
      billing_address: resolved.billing,
      metadata: {
        gstin: (formData.get("gstin") as string) || undefined,
      },
    },
  })

  if (resolved.saveShipping || resolved.saveBilling) {
    await persistCheckoutAddresses(resolved, billingSame)
  }

  revalidatePath("/checkout")
  revalidatePath("/account/addresses")
}

export async function listShippingOptions() {
  const cartId = await getCartId()
  if (!cartId) return []
  const { shipping_options } = await storeFetch<{
    shipping_options: HttpTypes.StoreCartShippingOption[]
  }>("/store/shipping-options", {
    query: { cart_id: cartId },
    revalidate: false,
  })
  return shipping_options
}

export async function setShippingMethod(optionId: string) {
  const cartId = await getCartId()
  if (!cartId) return
  await storeFetch(`/store/carts/${cartId}/shipping-methods`, {
    method: "POST",
    body: { option_id: optionId },
  })
  revalidatePath("/checkout")
}

export async function initiatePayment() {
  const cart = await retrieveCart()
  if (!cart) redirect("/cart")

  let collectionId = cart.payment_collection?.id
  if (!collectionId) {
    const { payment_collection } = await storeFetch<{
      payment_collection: { id: string }
    }>("/store/payment-collections", {
      method: "POST",
      body: { cart_id: cart.id },
    })
    collectionId = payment_collection.id
  }

  // Razorpay when configured on the backend; system default otherwise (dev/manual)
  const providers = await storeFetch<{
    payment_providers: { id: string }[]
  }>("/store/payment-providers", {
    query: { region_id: cart.region_id ?? undefined },
    revalidate: false,
  })
  const razorpay = providers.payment_providers.find((p) =>
    p.id.startsWith("pp_razorpay")
  )
  const providerId = razorpay?.id ?? "pp_system_default"

  const { payment_collection } = await storeFetch<{
    payment_collection: {
      payment_sessions?: { provider_id: string; data: Record<string, unknown> }[]
    }
  }>(`/store/payment-collections/${collectionId}/payment-sessions`, {
    method: "POST",
    body: { provider_id: providerId },
  })
  revalidatePath("/checkout")

  const session = payment_collection.payment_sessions?.find(
    (s) => s.provider_id === providerId
  )
  return { provider_id: providerId, session_data: session?.data ?? {} }
}

export async function placeOrder() {
  const cartId = await getCartId()
  if (!cartId) redirect("/cart")

  const result = await storeFetch<
    | { type: "order"; order: HttpTypes.StoreOrder }
    | { type: "cart"; cart: HttpTypes.StoreCart; error: { message: string } }
  >(`/store/carts/${cartId}/complete`, { method: "POST" })

  if (result.type === "order") {
    await removeCartId()
    redirect(`/order-confirmed/${result.order.id}`)
  }
  throw new Error(result.error?.message ?? "Failed to place order")
}
