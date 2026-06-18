"use client"

import { useActionState, useState } from "react"
import Link from "next/link"
import { signIn, signUp } from "@/lib/data/auth"

const inputClass =
  "w-full border border-[var(--color-line)] px-3 py-2 text-sm outline-none focus:border-[var(--color-line-strong)]"

export function AuthForms({
  redirectTo,
  errorMessage,
}: {
  redirectTo?: string
  errorMessage?: string
}) {
  const [mode, setMode] = useState<"signin" | "signup">("signin")
  const [signInState, signInAction, signInPending] = useActionState(
    signIn,
    undefined
  )
  const [signUpState, signUpAction, signUpPending] = useActionState(
    signUp,
    undefined
  )

  const googleHref = `/api/auth/google${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`

  return (
    <div className="border border-[var(--color-line)]">
      <div className="grid grid-cols-2 border-b border-[var(--color-line)] text-sm font-semibold">
        <button
          type="button"
          onClick={() => setMode("signin")}
          className={`py-3 ${mode === "signin" ? "bg-[var(--color-surface)]" : "bg-[var(--color-surface-alt)] text-[var(--color-ink-muted)]"}`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`border-l border-[var(--color-line)] py-3 ${mode === "signup" ? "bg-[var(--color-surface)]" : "bg-[var(--color-surface-alt)] text-[var(--color-ink-muted)]"}`}
        >
          Create Account
        </button>
      </div>

      <div className="border-b border-[var(--color-line)] p-6">
        <Link href={googleHref} className="btn-secondary block w-full px-4 py-2.5 text-center">
          Continue with Google
        </Link>
        <p className="mt-3 text-center text-xs text-[var(--color-ink-muted)]">
          or use email and password below
        </p>
      </div>

      {errorMessage && (
        <p className="border-b border-[var(--color-line)] px-6 py-3 text-sm text-[var(--color-bad)]">
          {errorMessage}
        </p>
      )}

      {mode === "signin" ? (
        <form action={signInAction} className="grid gap-4 p-6">
          <input type="hidden" name="redirect" value={redirectTo ?? ""} />
          <label className="grid gap-1 text-sm font-medium">
            Email
            <input type="email" name="email" required className={inputClass} />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Password
            <input
              type="password"
              name="password"
              required
              className={inputClass}
            />
          </label>
          {signInState?.error && (
            <p className="text-sm text-[var(--color-bad)]">{signInState.error}</p>
          )}
          <button
            type="submit"
            disabled={signInPending}
            className="btn-primary px-6 py-2.5"
          >
            {signInPending ? "Signing in…" : "Sign In"}
          </button>
        </form>
      ) : (
        <form action={signUpAction} className="grid gap-4 p-6">
          <input type="hidden" name="redirect" value={redirectTo ?? ""} />
          <div className="grid grid-cols-2 gap-4">
            <label className="grid gap-1 text-sm font-medium">
              First Name
              <input name="first_name" required className={inputClass} />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Last Name
              <input name="last_name" required className={inputClass} />
            </label>
          </div>
          <label className="grid gap-1 text-sm font-medium">
            Email
            <input type="email" name="email" required className={inputClass} />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Phone
            <input type="tel" name="phone" className={inputClass} />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Password
            <input
              type="password"
              name="password"
              required
              minLength={8}
              className={inputClass}
            />
          </label>
          <p className="text-xs text-[var(--color-ink-muted)]">
            We will send a verification link to your email before you can
            checkout.
          </p>
          {signUpState?.error && (
            <p className="text-sm text-[var(--color-bad)]">{signUpState.error}</p>
          )}
          <button
            type="submit"
            disabled={signUpPending}
            className="btn-primary px-6 py-2.5"
          >
            {signUpPending ? "Creating account…" : "Create Account"}
          </button>
        </form>
      )}
    </div>
  )
}
