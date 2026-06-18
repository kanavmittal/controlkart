import { NextRequest, NextResponse } from "next/server"
import { MEDUSA_BACKEND_URL, PUBLISHABLE_KEY } from "@/lib/config"
import { setAuthToken } from "@/lib/data/cookies"

/** Handles Google OAuth callback and sets the session cookie. */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    if (key !== "redirect") query[key] = value
  })

  const params = new URLSearchParams(query)
  const res = await fetch(
    `${MEDUSA_BACKEND_URL}/auth/customer/google/callback?${params}`,
    { method: "GET", cache: "no-store" }
  )

  const data = await res.json().catch(() => ({}))

  if (!res.ok || !data.token) {
    const message =
      data.message || "Google sign-in failed. Check your OAuth configuration."
    return NextResponse.redirect(
      new URL(`/account?error=${encodeURIComponent(message)}`, request.url)
    )
  }

  let token = data.token as string
  const refreshRes = await fetch(`${MEDUSA_BACKEND_URL}/auth/token/refresh`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "x-publishable-api-key": PUBLISHABLE_KEY,
    },
  })
  if (refreshRes.ok) {
    const refreshed = await refreshRes.json()
    if (refreshed.token) token = refreshed.token
  }

  await setAuthToken(token)

  // Ensure customer profile exists and mark Google email as verified
  const meRes = await fetch(`${MEDUSA_BACKEND_URL}/store/customers/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "x-publishable-api-key": PUBLISHABLE_KEY,
    },
    cache: "no-store",
  })

  if (meRes.status === 404 || meRes.status === 401) {
    const authRes = await fetch(`${MEDUSA_BACKEND_URL}/auth/customer/google`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
    const authIdentity = authRes.ok ? await authRes.json() : null
    const email =
      authIdentity?.email ||
      authIdentity?.user_metadata?.email ||
      authIdentity?.app_metadata?.email

    if (email) {
      await fetch(`${MEDUSA_BACKEND_URL}/store/customers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-publishable-api-key": PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          email,
          metadata: { email_verified: true },
        }),
        cache: "no-store",
      })
    }
  } else if (meRes.ok) {
    const { customer } = await meRes.json()
    if (customer && customer.metadata?.email_verified !== true) {
      await fetch(`${MEDUSA_BACKEND_URL}/store/customers/me`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-publishable-api-key": PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          metadata: { ...customer.metadata, email_verified: true },
        }),
        cache: "no-store",
      })
    }
  }

  const redirectTo = searchParams.get("redirect") || "/account"
  return NextResponse.redirect(new URL(redirectTo, request.url))
}
