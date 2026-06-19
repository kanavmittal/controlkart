"use client"

import { useAuthMutations } from "@/lib/hooks/use-customer"

function errorMessageOf(error: unknown): string {
  if (error instanceof Error) return error.message
  return "Could not send the verification email. Please try again."
}

export function VerificationBanner({
  devVerifyUrl,
}: {
  devVerifyUrl?: string
}) {
  const { resendVerification } = useAuthMutations()
  const data = resendVerification.data

  if (data?.already_verified) return null

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
      {data?.verify_url && (
        <p className="mt-2 break-all font-mono text-xs text-[var(--color-ink-muted)]">
          Dev link:{" "}
          <a
            href={data.verify_url}
            className="text-[var(--color-accent)] underline"
          >
            {data.verify_url}
          </a>
        </p>
      )}
      {resendVerification.error && (
        <p className="mt-2 text-sm text-[var(--color-bad)]">
          {errorMessageOf(resendVerification.error)}
        </p>
      )}
      {data?.sent && !resendVerification.error && (
        <p className="mt-2 text-sm text-[var(--color-ok)]">
          Verification email sent.
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          resendVerification.mutate()
        }}
        className="mt-3"
      >
        <button
          type="submit"
          disabled={resendVerification.isPending}
          className="btn-secondary px-4 py-2 text-sm"
        >
          {resendVerification.isPending ? "Sending…" : "Resend verification email"}
        </button>
      </form>
    </div>
  )
}
