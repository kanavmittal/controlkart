"use client"

import { useId, useState } from "react"
import { Loader2 } from "lucide-react"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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

  return (
    <div className="border border-athens-line bg-white">
      <Tabs
        value={mode}
        onValueChange={(v) => setMode(v as "signin" | "signup")}
      >
        <TabsList
          variant="line"
          className="grid w-full grid-cols-2 rounded-none border-b border-athens-line bg-transparent p-0"
        >
          <TabsTrigger
            value="signin"
            className="h-12 rounded-none border-0 text-sm font-semibold text-athens-body data-active:bg-athens-band data-active:text-athens-dark data-active:shadow-none data-active:after:opacity-0"
          >
            Sign In
          </TabsTrigger>
          <TabsTrigger
            value="signup"
            className="h-12 rounded-none border-0 border-l border-athens-line text-sm font-semibold text-athens-body data-active:bg-athens-band data-active:text-athens-dark data-active:shadow-none data-active:after:opacity-0"
          >
            Create Account
          </TabsTrigger>
        </TabsList>

        <div className="border-b border-athens-line p-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogle}
            className="w-full"
          >
            <span
              aria-hidden
              className="inline-flex size-4 items-center justify-center rounded-full bg-[#4285F4] text-[11px] font-bold leading-none text-white"
            >
              G
            </span>
            Continue with Google
          </Button>
          <p className="mt-3 text-center text-xs text-athens-body">
            or use email and password below
          </p>
        </div>

        {errorMessage && (
          <p className="border-b border-athens-line bg-destructive/5 px-6 py-3 text-sm text-destructive">
            {errorMessage}
          </p>
        )}

        <TabsContent value="signin" className="p-6">
          <form onSubmit={handleSignIn} id={`${formId}-signin`}>
            <input type="hidden" name="redirect" value={redirectTo ?? ""} />
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
                  aria-invalid={!!login.error}
                />
              </Field>
              <Field data-invalid={!!login.error}>
                <FieldLabel htmlFor={`${formId}-signin-password`}>
                  Password
                </FieldLabel>
                <Input
                  id={`${formId}-signin-password`}
                  type="password"
                  name="password"
                  required
                  aria-invalid={!!login.error}
                />
                {login.error && (
                  <FieldError>{errorMessageOf(login.error)}</FieldError>
                )}
              </Field>
              <Button type="submit" disabled={login.isPending} className="mt-2">
                {login.isPending && (
                  <Loader2 className="animate-spin" data-icon="inline-start" />
                )}
                {login.isPending ? "Signing in…" : "Sign In"}
              </Button>
            </FieldGroup>
          </form>
        </TabsContent>

        <TabsContent value="signup" className="p-6">
          <form onSubmit={handleSignUp} id={`${formId}-signup`}>
            <input type="hidden" name="redirect" value={redirectTo ?? ""} />
            <FieldGroup>
              <div className="grid grid-cols-2 gap-4">
                <Field data-invalid={!!register.error}>
                  <FieldLabel htmlFor={`${formId}-first-name`}>
                    First Name
                  </FieldLabel>
                  <Input
                    id={`${formId}-first-name`}
                    name="first_name"
                    required
                    aria-invalid={!!register.error}
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
                    aria-invalid={!!register.error}
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
                  aria-invalid={!!register.error}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${formId}-phone`}>Phone</FieldLabel>
                <Input id={`${formId}-phone`} type="tel" name="phone" />
              </Field>
              <Field data-invalid={!!register.error}>
                <FieldLabel htmlFor={`${formId}-signup-password`}>
                  Password
                </FieldLabel>
                <Input
                  id={`${formId}-signup-password`}
                  type="password"
                  name="password"
                  required
                  minLength={8}
                  aria-invalid={!!register.error}
                />
                {register.error && (
                  <FieldError>{errorMessageOf(register.error)}</FieldError>
                )}
              </Field>
              <p className="text-xs text-athens-body">
                We will send a verification link to your email before you can
                checkout.
              </p>
              <Button
                type="submit"
                disabled={register.isPending}
                className={cn("mt-2")}
              >
                {register.isPending && (
                  <Loader2 className="animate-spin" data-icon="inline-start" />
                )}
                {register.isPending ? "Creating account…" : "Create Account"}
              </Button>
            </FieldGroup>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  )
}
