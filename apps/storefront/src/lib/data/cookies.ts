import "server-only"
import { cookies } from "next/headers"

const CART_COOKIE = "_controlkart_cart_id"
const AUTH_COOKIE = "_controlkart_jwt"

export async function getCartId() {
  return (await cookies()).get(CART_COOKIE)?.value
}

export async function setCartId(cartId: string) {
  ;(await cookies()).set(CART_COOKIE, cartId, {
    maxAge: 60 * 60 * 24 * 30,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  })
}

export async function removeCartId() {
  ;(await cookies()).delete(CART_COOKIE)
}

export async function getAuthToken() {
  return (await cookies()).get(AUTH_COOKIE)?.value
}

export async function setAuthToken(token: string) {
  ;(await cookies()).set(AUTH_COOKIE, token, {
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  })
}

export async function removeAuthToken() {
  ;(await cookies()).delete(AUTH_COOKIE)
}

export async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}
