import { NextRequest, NextResponse } from "next/server"
import { MEDUSA_BACKEND_URL, PUBLISHABLE_KEY } from "@/lib/config"

/** Starts Google OAuth — redirects browser to Google's consent screen. */
export async function GET(request: NextRequest) {
  const redirectTo = request.nextUrl.searchParams.get("redirect") || "/account"
  const callbackUrl = new URL("/api/auth/google/callback", request.url)
  callbackUrl.searchParams.set("redirect", redirectTo)

  const res = await fetch(`${MEDUSA_BACKEND_URL}/auth/customer/google`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-publishable-api-key": PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ callback_url: callbackUrl.toString() }),
    cache: "no-store",
  })

  const data = await res.json().catch(() => ({}))

  if (data.location) {
    return NextResponse.redirect(data.location)
  }

  const message =
    data.message ||
    "Google sign-in is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on the Medusa backend."
  return NextResponse.redirect(
    new URL(`/account?error=${encodeURIComponent(message)}`, request.url)
  )
}
