"use client"

import { Loader2, MailWarning } from "lucide-react"
import { useAuthMutations } from "@/lib/hooks/use-customer"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

function errorMessageOf(error: unknown): string {
  if (error instanceof Error) return error.message
  return "Could not send the verification email. Please try again."
}

// Athens-styled warning alert shown on the account dashboard while
// `customer.metadata.email_verified` is falsy. Logic untouched from the
// pre-restyle version: `resendVerification` (useAuthMutations) POSTs
// /store/auth/send-verification; `already_verified` in the response hides
// the banner entirely (a race where the customer verified in another tab);
// `verify_url`/`devVerifyUrl` surface the dev-mode magic link.
export function VerificationBanner({
  devVerifyUrl,
}: {
  devVerifyUrl?: string
}) {
  const { resendVerification } = useAuthMutations()
  const data = resendVerification.data

  if (data?.already_verified) return null

  return (
    <Alert className="mt-6 border-athens-warning/40 bg-athens-warning-bg">
      <MailWarning className="text-athens-warning" aria-hidden />
      <AlertTitle className="text-athens-warning">
        Please verify your email before placing an order
      </AlertTitle>
      <AlertDescription className="text-athens-body">
        We sent a verification link to your inbox. Check spam if you do not see
        it within a few minutes.
      </AlertDescription>

      {devVerifyUrl && (
        <p className="mt-1 break-all font-mono text-xs text-athens-body">
          Dev link:{" "}
          <a href={devVerifyUrl} className="text-athens-blue underline">
            {devVerifyUrl}
          </a>
        </p>
      )}
      {data?.verify_url && (
        <p className="mt-1 break-all font-mono text-xs text-athens-body">
          {data.send_failed ? (
            <>
              We couldn&apos;t send the email right now — verify directly with
              this link:{" "}
            </>
          ) : (
            <>Dev link: </>
          )}
          <a href={data.verify_url} className="text-athens-blue underline">
            {data.verify_url}
          </a>
        </p>
      )}
      {resendVerification.error && (
        <p className="mt-1 text-sm text-destructive">
          {errorMessageOf(resendVerification.error)}
        </p>
      )}
      {data?.sent && !resendVerification.error && (
        <p className="mt-1 text-sm text-athens-success">
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
        <Button
          type="submit"
          variant="outline"
          size="sm"
          disabled={resendVerification.isPending}
          data-icon={resendVerification.isPending ? "inline-start" : undefined}
        >
          {resendVerification.isPending && (
            <Loader2 className="animate-spin" aria-hidden />
          )}
          {resendVerification.isPending
            ? "Sending…"
            : "Resend verification email"}
        </Button>
      </form>
    </Alert>
  )
}
