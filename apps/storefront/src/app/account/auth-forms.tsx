"use client"

import { useId, useState } from "react"
import { CheckCircle2, Eye, EyeOff, Loader2, MailCheck } from "lucide-react"
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

const inputClass =
  "h-11 rounded-lg border-athens-line bg-white focus-visible:border-athens-blue focus-visible:ring-athens-blue/15"

function errorMessageOf(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message
    // Network-level failures read badly raw — normalize them.
    if (
      /failed to fetch|fetch failed|networkerror|network request failed/i.test(
        msg
      )
    ) {
      return "Could not reach the server. Check your connection and try again."
    }
    return msg
  }
  return "Something went wrong. Please try again."
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  )
}

function PasswordInput({
  id,
  name,
  invalid,
  autoComplete,
  minLength,
}: {
  id: string
  name: string
  invalid?: boolean
  autoComplete?: string
  minLength?: number
}) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        name={name}
        required
        minLength={minLength}
        autoComplete={autoComplete}
        aria-invalid={invalid}
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
  )
}

function ForgotPasswordCard({ onBack }: { onBack: () => void }) {
  const { requestPasswordReset } = useAuthMutations()
  const formId = useId()
  const [sentTo, setSentTo] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const email = String(new FormData(e.currentTarget).get("email") ?? "")
    try {
      await requestPasswordReset.mutateAsync(email)
    } catch {
      /* unknown emails also land here — the confirmation stays generic */
    }
    setSentTo(email)
  }

  return (
    <div className="rounded-2xl border border-athens-line bg-white p-6 shadow-[0_18px_50px_-24px_rgba(35,35,35,0.25)] sm:p-8">
      {sentTo ? (
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-athens-success-bg">
            <MailCheck className="size-6 text-athens-success" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-athens-dark">
              Check your inbox
            </h2>
            <p className="mt-2 text-sm text-athens-body">
              If an account exists for{" "}
              <span className="font-medium text-athens-dark">{sentTo}</span>,
              we&apos;ve sent a password-reset link. It expires in 15 minutes.
            </p>
          </div>
          <Button variant="outline" onClick={onBack} className="mt-2">
            Back to sign in
          </Button>
        </div>
      ) : (
        <>
          <h2 className="text-lg font-semibold text-athens-dark">
            Reset your password
          </h2>
          <p className="mt-1 text-sm text-athens-body">
            Enter the email you registered with and we&apos;ll send you a reset
            link.
          </p>
          <form onSubmit={handleSubmit} className="mt-6">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={`${formId}-forgot-email`}>
                  Email
                </FieldLabel>
                <Input
                  id={`${formId}-forgot-email`}
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  className={inputClass}
                />
              </Field>
              <Button
                type="submit"
                disabled={requestPasswordReset.isPending}
                className="mt-2 h-11 w-full rounded-lg bg-athens-blue font-semibold text-white hover:bg-athens-blue/90"
              >
                {requestPasswordReset.isPending && (
                  <Loader2 className="animate-spin" data-icon="inline-start" />
                )}
                {requestPasswordReset.isPending
                  ? "Sending link…"
                  : "Send reset link"}
              </Button>
            </FieldGroup>
          </form>
          <button
            type="button"
            onClick={onBack}
            className="mt-4 w-full text-center text-sm font-medium text-athens-blue hover:underline"
          >
            Back to sign in
          </button>
        </>
      )}
    </div>
  )
}

export function AuthForms({
  redirectTo,
  errorMessage,
}: {
  redirectTo?: string
  errorMessage?: string
}) {
  const [mode, setMode] = useState<"signin" | "signup">("signin")
  const [forgotOpen, setForgotOpen] = useState(false)
  const { login, register } = useAuthMutations()
  const formId = useId()

  async function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    try {
      await login.mutateAsync({
        email: String(form.get("email") ?? ""),
        password: String(form.get("password") ?? ""),
      })
      window.location.href = redirectTo || "/account"
    } catch {
      /* surfaced via login.error */
    }
  }

  async function handleSignUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    try {
      await register.mutateAsync({
        email: String(form.get("email") ?? ""),
        password: String(form.get("password") ?? ""),
        first_name: String(form.get("first_name") ?? ""),
        last_name: String(form.get("last_name") ?? ""),
        phone: String(form.get("phone") ?? "") || undefined,
      })
      const target = redirectTo || "/account"
      const sep = target.includes("?") ? "&" : "?"
      window.location.href = `${target}${sep}verify=sent`
    } catch {
      /* surfaced via register.error */
    }
  }

  async function handleGoogle() {
    // Preserve the post-login destination across the OAuth round-trip; the
    // client callback page reads it back (the backend callback_url is fixed).
    try {
      sessionStorage.setItem("_ck_oauth_redirect", redirectTo || "/account")
    } catch {
      /* sessionStorage unavailable — fall back to /account */
    }
    try {
      const res = await sdk.auth.login("customer", "google", {})
      if (res && typeof res === "object" && "location" in res && res.location) {
        window.location.href = res.location
      } else {
        window.location.href =
          "/account?error=" +
          encodeURIComponent("Google sign-in is not configured.")
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Google sign-in failed."
      window.location.href = "/account?error=" + encodeURIComponent(message)
    }
  }

  if (forgotOpen) {
    return <ForgotPasswordCard onBack={() => setForgotOpen(false)} />
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-athens-line bg-white shadow-[0_18px_50px_-24px_rgba(35,35,35,0.25)]">
      <div className="p-6 pb-0 sm:p-8 sm:pb-0">
        <div
          role="tablist"
          aria-label="Account access"
          className="relative grid grid-cols-2 rounded-full bg-athens-band p-1"
        >
          <span
            aria-hidden
            className={cn(
              "absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-white shadow-sm transition-transform duration-200 ease-out",
              mode === "signup" && "translate-x-full"
            )}
          />
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signin"}
            onClick={() => setMode("signin")}
            className={cn(
              "relative z-10 h-10 rounded-full text-sm font-semibold transition-colors",
              mode === "signin"
                ? "text-athens-dark"
                : "text-athens-body hover:text-athens-dark"
            )}
          >
            Sign In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signup"}
            onClick={() => setMode("signup")}
            className={cn(
              "relative z-10 h-10 rounded-full text-sm font-semibold transition-colors",
              mode === "signup"
                ? "text-athens-dark"
                : "text-athens-body hover:text-athens-dark"
            )}
          >
            Create Account
          </button>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleGoogle}
          className="mt-6 h-11 w-full rounded-lg border-athens-line font-medium hover:bg-athens-band"
        >
          <GoogleMark />
          Continue with Google
        </Button>

        <div className="mt-5 flex items-center gap-3" aria-hidden>
          <span className="h-px flex-1 bg-athens-line" />
          <span className="text-xs tracking-wide text-athens-body uppercase">
            or continue with email
          </span>
          <span className="h-px flex-1 bg-athens-line" />
        </div>

        {errorMessage && (
          <p className="mt-5 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </p>
        )}
      </div>

      {mode === "signin" ? (
        <div className="p-6 pt-5 sm:p-8 sm:pt-5">
          <form onSubmit={handleSignIn} id={`${formId}-signin`}>
            <FieldGroup>
              <Field data-invalid={!!login.error}>
                <FieldLabel htmlFor={`${formId}-signin-email`}>
                  Email
                </FieldLabel>
                <Input
                  id={`${formId}-signin-email`}
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  aria-invalid={!!login.error}
                  className={inputClass}
                />
              </Field>
              <Field data-invalid={!!login.error}>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor={`${formId}-signin-password`}>
                    Password
                  </FieldLabel>
                  <button
                    type="button"
                    onClick={() => setForgotOpen(true)}
                    className="text-xs font-medium text-athens-blue hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <PasswordInput
                  id={`${formId}-signin-password`}
                  name="password"
                  invalid={!!login.error}
                  autoComplete="current-password"
                />
                {login.error && (
                  <FieldError>{errorMessageOf(login.error)}</FieldError>
                )}
              </Field>
              <Button
                type="submit"
                disabled={login.isPending}
                className="mt-2 h-11 w-full rounded-lg bg-athens-blue font-semibold text-white hover:bg-athens-blue/90"
              >
                {login.isPending && (
                  <Loader2 className="animate-spin" data-icon="inline-start" />
                )}
                {login.isPending ? "Signing in…" : "Sign In"}
              </Button>
            </FieldGroup>
          </form>
        </div>
      ) : (
        <div className="p-6 pt-5 sm:p-8 sm:pt-5">
          <form onSubmit={handleSignUp} id={`${formId}-signup`}>
            <FieldGroup>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field data-invalid={!!register.error}>
                  <FieldLabel htmlFor={`${formId}-first-name`}>
                    First Name
                  </FieldLabel>
                  <Input
                    id={`${formId}-first-name`}
                    name="first_name"
                    required
                    autoComplete="given-name"
                    aria-invalid={!!register.error}
                    className={inputClass}
                  />
                </Field>
                <Field data-invalid={!!register.error}>
                  <FieldLabel htmlFor={`${formId}-last-name`}>
                    Last Name
                  </FieldLabel>
                  <Input
                    id={`${formId}-last-name`}
                    name="last_name"
                    required
                    autoComplete="family-name"
                    aria-invalid={!!register.error}
                    className={inputClass}
                  />
                </Field>
              </div>
              <Field data-invalid={!!register.error}>
                <FieldLabel htmlFor={`${formId}-signup-email`}>
                  Email
                </FieldLabel>
                <Input
                  id={`${formId}-signup-email`}
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  aria-invalid={!!register.error}
                  className={inputClass}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${formId}-phone`}>
                  Phone{" "}
                  <span className="font-normal text-athens-body">
                    (optional)
                  </span>
                </FieldLabel>
                <Input
                  id={`${formId}-phone`}
                  type="tel"
                  name="phone"
                  autoComplete="tel"
                  className={inputClass}
                />
              </Field>
              <Field data-invalid={!!register.error}>
                <FieldLabel htmlFor={`${formId}-signup-password`}>
                  Password
                </FieldLabel>
                <PasswordInput
                  id={`${formId}-signup-password`}
                  name="password"
                  invalid={!!register.error}
                  autoComplete="new-password"
                  minLength={8}
                />
                <p className="text-xs text-athens-body">
                  Minimum 8 characters.
                </p>
                {register.error && (
                  <FieldError>{errorMessageOf(register.error)}</FieldError>
                )}
              </Field>
              <p className="flex items-start gap-2 text-xs text-athens-body">
                <CheckCircle2
                  className="mt-0.5 size-3.5 shrink-0 text-athens-blue"
                  aria-hidden
                />
                We&apos;ll send a verification link to your email before you
                can checkout.
              </p>
              <Button
                type="submit"
                disabled={register.isPending}
                className="mt-2 h-11 w-full rounded-lg bg-athens-blue font-semibold text-white hover:bg-athens-blue/90"
              >
                {register.isPending && (
                  <Loader2 className="animate-spin" data-icon="inline-start" />
                )}
                {register.isPending ? "Creating account…" : "Create Account"}
              </Button>
            </FieldGroup>
          </form>
        </div>
      )}
    </div>
  )
}
