"use client"

import { useState } from "react"
import { sdk } from "@/lib/sdk"
import { useAuthMutations } from "@/lib/hooks/use-customer"

const inputClass =
  "w-full border border-[var(--color-line)] px-3 py-2 text-sm outline-none focus:border-[var(--color-line-strong)]"

function errorMessageOf(error: unknown): string {
  if (error instanceof Error) return error.message
  return "Something went wrong. Please try again."
}

export function AuthForms({
  redirectTo,
  errorMessage,
}: {
  redirectTo?: string
  errorMessage?: string
}) {
  const [mode, setMode] = useState<"signin" | "signup">("signin")
  const { login, register } = useAuthMutations()

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
        <button
          type="button"
          onClick={handleGoogle}
          className="btn-secondary block w-full px-4 py-2.5 text-center"
        >
          Continue with Google
        </button>
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
        <form onSubmit={handleSignIn} className="grid gap-4 p-6">
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
          {login.error && (
            <p className="text-sm text-[var(--color-bad)]">
              {errorMessageOf(login.error)}
            </p>
          )}
          <button
            type="submit"
            disabled={login.isPending}
            className="btn-primary px-6 py-2.5"
          >
            {login.isPending ? "Signing in…" : "Sign In"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleSignUp} className="grid gap-4 p-6">
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
          {register.error && (
            <p className="text-sm text-[var(--color-bad)]">
              {errorMessageOf(register.error)}
            </p>
          )}
          <button
            type="submit"
            disabled={register.isPending}
            className="btn-primary px-6 py-2.5"
          >
            {register.isPending ? "Creating account…" : "Create Account"}
          </button>
        </form>
      )}
    </div>
  )
}
