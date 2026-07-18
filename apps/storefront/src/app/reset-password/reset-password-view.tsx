"use client"

import { useId, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Eye, EyeOff, KeyRound, Loader2, XCircle } from "lucide-react"

import { sdk } from "@/lib/sdk"
import { useAuthMutations } from "@/lib/hooks/use-customer"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Card, CardContent } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"

const inputClass =
  "h-11 rounded-lg border-athens-line bg-white focus-visible:border-athens-blue focus-visible:ring-athens-blue/15"

/** The reset token is a JWT whose payload carries the account email. */
function emailFromToken(token: string): string | null {
  try {
    const payload = token.split(".")[1]
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/")
    const json = JSON.parse(atob(base64)) as { entity_id?: string }
    return json.entity_id ?? null
  } catch {
    return null
  }
}

function InvalidLinkCard() {
  return (
    <Card className="w-full max-w-md border-destructive/40 bg-destructive/10">
      <CardContent className="flex flex-col items-center gap-4 text-center">
        <XCircle className="size-10 text-destructive" aria-hidden />
        <div>
          <h1 className="text-xl font-medium text-destructive">
            Invalid reset link
          </h1>
          <p className="mt-2 text-sm text-athens-body">
            This link is missing a reset token. Request a fresh reset link to
            continue.
          </p>
        </div>
        <Link
          href="/account"
          className={cn(buttonVariants({ variant: "default" }))}
        >
          Request a new link
        </Link>
      </CardContent>
    </Card>
  )
}

export function ResetPasswordView() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token") ?? ""
  const { resetPassword } = useAuthMutations()
  const formId = useId()
  const [visible, setVisible] = useState(false)
  const [mismatch, setMismatch] = useState(false)
  const [failed, setFailed] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const password = String(form.get("password") ?? "")
    const confirm = String(form.get("confirm_password") ?? "")
    if (password !== confirm) {
      setMismatch(true)
      return
    }
    setMismatch(false)
    try {
      await resetPassword.mutateAsync({ password, token })
    } catch {
      setFailed(true)
      return
    }
    // Sign in with the new password so the user lands straight in their
    // account; if that fails for any reason, fall back to the sign-in page.
    const email = emailFromToken(token)
    if (email) {
      try {
        await sdk.auth.login("customer", "emailpass", { email, password })
        window.location.href = "/account"
        return
      } catch {
        /* fall through to the sign-in page */
      }
    }
    window.location.href = "/account"
  }

  return (
    <div className="athens-container flex min-h-[60vh] flex-col items-center justify-center py-16">
      {!token ? (
        <InvalidLinkCard />
      ) : failed ? (
        <Card className="w-full max-w-md border-destructive/40 bg-destructive/10">
          <CardContent className="flex flex-col items-center gap-4 text-center">
            <XCircle className="size-10 text-destructive" aria-hidden />
            <div>
              <h1 className="text-xl font-medium text-destructive">
                Reset link expired
              </h1>
              <p className="mt-2 text-sm text-athens-body">
                This reset link is invalid or has expired (links last 15
                minutes). Request a new one and try again.
              </p>
            </div>
            <Link
              href="/account"
              className={cn(buttonVariants({ variant: "default" }))}
            >
              Request a new link
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="w-full max-w-md rounded-2xl border border-athens-line bg-white p-6 shadow-[0_18px_50px_-24px_rgba(35,35,35,0.25)] sm:p-8">
          <span className="flex size-12 items-center justify-center rounded-full bg-athens-band">
            <KeyRound className="size-6 text-athens-blue" aria-hidden />
          </span>
          <h1 className="mt-4 text-xl font-semibold text-athens-dark">
            Choose a new password
          </h1>
          <p className="mt-1 text-sm text-athens-body">
            Minimum 8 characters. You&apos;ll be signed in automatically
            afterwards.
          </p>
          <form onSubmit={handleSubmit} className="mt-6">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={`${formId}-password`}>
                  New password
                </FieldLabel>
                <div className="relative">
                  <Input
                    id={`${formId}-password`}
                    type={visible ? "text" : "password"}
                    name="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className={cn(inputClass, "pr-11")}
                  />
                  <button
                    type="button"
                    onClick={() => setVisible((v) => !v)}
                    aria-label={visible ? "Hide password" : "Show password"}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-athens-body transition-colors hover:text-athens-dark"
                  >
                    {visible ? (
                      <EyeOff className="size-4" aria-hidden />
                    ) : (
                      <Eye className="size-4" aria-hidden />
                    )}
                  </button>
                </div>
              </Field>
              <Field data-invalid={mismatch}>
                <FieldLabel htmlFor={`${formId}-confirm`}>
                  Confirm new password
                </FieldLabel>
                <Input
                  id={`${formId}-confirm`}
                  type={visible ? "text" : "password"}
                  name="confirm_password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  aria-invalid={mismatch}
                  className={inputClass}
                />
                {mismatch && (
                  <FieldError>Passwords don&apos;t match.</FieldError>
                )}
              </Field>
              <Button
                type="submit"
                disabled={resetPassword.isPending}
                className="mt-2 h-11 w-full rounded-lg bg-athens-blue font-semibold text-white hover:bg-athens-blue/90"
              >
                {resetPassword.isPending && (
                  <Loader2 className="animate-spin" data-icon="inline-start" />
                )}
                {resetPassword.isPending ? "Updating…" : "Update password"}
              </Button>
            </FieldGroup>
          </form>
        </div>
      )}
    </div>
  )
}
