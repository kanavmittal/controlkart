"use client"

import { useActionState } from "react"
import { resendVerificationEmail } from "@/lib/data/auth"

export function VerificationBanner({
  devVerifyUrl,
}: {
  devVerifyUrl?: string
}) {
  const [state, action, pending] = useActionState(
    resendVerificationEmail,
    undefined
  )

  if (state?.already_verified) return null

  return (
    <div className="mt-6 border border-[var(--color-warn)] bg-[var(--color-surface-alt)] p-4">
      <p className="text-sm font-medium">
        Please verify your email before placing an order.
      </p>
      <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
        We sent a verification link to your inbox. Check spam if you do not see
        it within a few minutes.
      </p>
      {devVerifyUrl && (
        <p className="mt-2 break-all font-mono text-xs text-[var(--color-ink-muted)]">
          Dev link:{" "}
          <a href={devVerifyUrl} className="text-[var(--color-accent)] underline">
            {devVerifyUrl}
          </a>
        </p>
      )}
      {state?.verify_url && (
        <p className="mt-2 break-all font-mono text-xs text-[var(--color-ink-muted)]">
          Dev link:{" "}
          <a
            href={state.verify_url}
            className="text-[var(--color-accent)] underline"
          >
            {state.verify_url}
          </a>
        </p>
      )}
      {state?.error && (
        <p className="mt-2 text-sm text-[var(--color-bad)]">{state.error}</p>
      )}
      {state?.sent && !state.error && (
        <p className="mt-2 text-sm text-[var(--color-ok)]">
          Verification email sent.
        </p>
      )}
      <form action={action} className="mt-3">
        <button
          type="submit"
          disabled={pending}
          className="btn-secondary px-4 py-2 text-sm"
        >
          {pending ? "Sending…" : "Resend verification email"}
        </button>
      </form>
    </div>
  )
}
