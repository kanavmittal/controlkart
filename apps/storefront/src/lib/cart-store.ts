import { sdk } from "./sdk"

/**
 * Client-side cart-id store. The cart is public (publishable key only), so the
 * cart id lives in localStorage (Phase 2 CSR). SSR-safe: guards `window`.
 */
const CART_ID_KEY = "_ck_cart_id"

export function getCartId(): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(CART_ID_KEY)
}

export function setCartId(id: string): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(CART_ID_KEY, id)
}

export function clearCartId(): void {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(CART_ID_KEY)
}

/**
 * Return the existing cart id, or create a fresh cart for the region and persist
 * it. Used before the first add-to-cart.
 */
export async function getOrCreateCartId(regionId?: string): Promise<string> {
  const existing = getCartId()
  if (existing) return existing
  const { cart } = await sdk.store.cart.create(
    regionId ? { region_id: regionId } : {}
  )
  setCartId(cart.id)
  return cart.id
}
