import "server-only"
import { cookies } from "next/headers"

// Phase 2 moved cart + customer auth to the browser SDK (localStorage), so the
// cart-id / JWT cookies are no longer written. Only the request-quote flow still
// reads an auth header server-side; kept for that one consumer.
const AUTH_COOKIE = "_controlkart_jwt"

async function getAuthToken() {
  return (await cookies()).get(AUTH_COOKIE)?.value
}

export async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}
