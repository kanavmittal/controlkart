import type { Metadata } from "next"
import Link from "next/link"
import { revalidatePath } from "next/cache"
import { MEDUSA_BACKEND_URL, PUBLISHABLE_KEY } from "@/lib/config"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Verify Email",
  robots: { index: false },
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  if (!token) {
    return (
      <div className="shell py-12">
        <div className="mx-auto max-w-md border border-[var(--color-line)] p-6">
          <h1 className="text-xl font-bold">Invalid verification link</h1>
          <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
            This link is missing a verification token. Request a new one from
            your account page.
          </p>
          <Link href="/account" className="btn-primary mt-4 inline-block px-4 py-2.5">
            Go to Account
          </Link>
        </div>
      </div>
    )
  }

  let verified = false
  let email: string | undefined
  let error: string | undefined

  try {
    const res = await fetch(
      `${MEDUSA_BACKEND_URL}/store/auth/verify-email?token=${encodeURIComponent(token)}`,
      {
        cache: "no-store",
        headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
      }
    )
    const data = await res.json()
    if (res.ok) {
      verified = true
      email = data.email
      revalidatePath("/account")
      revalidatePath("/checkout")
      revalidatePath("/cart")
    } else {
      error = data.message || "Verification failed"
    }
  } catch {
    error = "Could not reach the server. Try again in a moment."
  }

  return (
    <div className="shell py-12">
      <div className="mx-auto max-w-md border border-[var(--color-line)] p-6">
        {verified ? (
          <>
            <h1 className="text-xl font-bold text-[var(--color-ok)]">
              Email verified
            </h1>
            <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
              {email ? (
                <>
                  <span className="font-medium text-[var(--color-ink)]">
                    {email}
                  </span>{" "}
                  is now verified. You can place orders.
                </>
              ) : (
                "Your email is verified. You can place orders."
              )}
            </p>
            <Link
              href="/account"
              className="btn-primary mt-4 inline-block px-4 py-2.5"
            >
              Continue to Account
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-[var(--color-bad)]">
              Verification failed
            </h1>
            <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
              {error}
            </p>
            <Link
              href="/account"
              className="btn-primary mt-4 inline-block px-4 py-2.5"
            >
              Go to Account
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
