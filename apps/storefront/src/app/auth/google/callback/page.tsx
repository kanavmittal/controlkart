"use client"

import { useEffect, useRef, useState } from "react"
import { sdk } from "@/lib/sdk"

/**
 * Client-side Google OAuth callback (CSR). Google redirects the browser here
 * (the backend provider's `callback_url` must point at this page). We hand the
 * query params to the SDK, which validates the code and stores the JWT in
 * localStorage, then ensure a customer profile exists before redirecting.
 *
 * Backend ops: set `GOOGLE_CALLBACK_URL=https://controlkart.com/auth/google/callback`
 * on Medusa and add that URL to the Google Cloud OAuth authorized redirect URIs.
 */
function decodeJwt(token: string): Record<string, unknown> {
  try {
    const payload = token.split(".")[1]
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/")
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    )
    return JSON.parse(json)
  } catch {
    return {}
  }
}

function readRedirect(): string {
  try {
    const stored = sessionStorage.getItem("_ck_oauth_redirect")
    sessionStorage.removeItem("_ck_oauth_redirect")
    if (stored && stored.startsWith("/")) return stored
  } catch {
    /* ignore */
  }
  return "/account"
}

export default function GoogleCallbackPage() {
  const [error, setError] = useState<string | null>(null)
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    async function run() {
      const query = Object.fromEntries(
        new URLSearchParams(window.location.search)
      )
      try {
        const token = await sdk.auth.callback("customer", "google", query)
        if (typeof token !== "string") {
          throw new Error("Google sign-in needs additional verification.")
        }

        const decoded = decodeJwt(token) as {
          actor_id?: string
          user_metadata?: Record<string, unknown>
        }
        const meta = decoded.user_metadata ?? {}

        if (decoded.actor_id === "") {
          // First sign-in: create the customer profile. Google verifies the
          // email, so mark it verified (satisfies the checkout email gate).
          await sdk.store.customer.create({
            email: meta.email as string,
            first_name: (meta.given_name as string) || undefined,
            last_name: (meta.family_name as string) || undefined,
            metadata: { email_verified: true },
          })
          await sdk.auth.refresh()
        } else {
          // Returning customer: ensure the Google-verified flag is set.
          try {
            const { customer } = await sdk.store.customer.retrieve()
            if (customer?.metadata?.email_verified !== true) {
              await sdk.store.customer.update({
                metadata: { ...customer.metadata, email_verified: true },
              })
            }
          } catch {
            /* non-fatal */
          }
        }

        window.location.href = readRedirect()
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Google sign-in failed."
        setError(message)
        window.location.href = "/account?error=" + encodeURIComponent(message)
      }
    }

    run()
  }, [])

  return (
    <div className="shell py-24 text-center">
      <p className="text-sm text-[var(--color-ink-muted)]">
        {error ? "Redirecting…" : "Signing you in…"}
      </p>
    </div>
  )
}
