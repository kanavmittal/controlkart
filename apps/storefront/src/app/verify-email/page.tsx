import type { Metadata } from "next"
import Link from "next/link"
import { revalidatePath } from "next/cache"
import { CheckCircle2, MailQuestion, XCircle } from "lucide-react"
import { MEDUSA_BACKEND_URL, PUBLISHABLE_KEY } from "@/lib/config"
import { Card, CardContent } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

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
      <div className="athens-container flex min-h-[60vh] flex-col items-center justify-center py-16">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 text-center">
            <MailQuestion className="size-10 text-athens-body" aria-hidden />
            <div>
              <h1 className="text-xl font-medium text-athens-dark">
                Invalid verification link
              </h1>
              <p className="mt-2 text-sm text-athens-body">
                This link is missing a verification token. Request a new one
                from your account page.
              </p>
            </div>
            <Link
              href="/account"
              className={cn(buttonVariants({ variant: "default" }))}
            >
              Go to Account
            </Link>
          </CardContent>
        </Card>
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
    <div className="athens-container flex min-h-[60vh] flex-col items-center justify-center py-16">
      <Card
        className={cn(
          "w-full max-w-md",
          verified
            ? "border-athens-success/40 bg-athens-success-bg"
            : "border-destructive/40 bg-destructive/10"
        )}
      >
        <CardContent className="flex flex-col items-center gap-4 text-center">
          {verified ? (
            <>
              <CheckCircle2
                className="size-10 text-athens-success"
                aria-hidden
              />
              <div>
                <h1 className="text-xl font-medium text-athens-success">
                  Email verified
                </h1>
                <p className="mt-2 text-sm text-athens-body">
                  {email ? (
                    <>
                      <span className="font-medium text-athens-dark">
                        {email}
                      </span>{" "}
                      is now verified. You can place orders.
                    </>
                  ) : (
                    "Your email is verified. You can place orders."
                  )}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/account"
                  className={cn(buttonVariants({ variant: "default" }))}
                >
                  Go to your account
                </Link>
                <Link
                  href="/products"
                  className={cn(buttonVariants({ variant: "outline" }))}
                >
                  Continue shopping
                </Link>
              </div>
            </>
          ) : (
            <>
              <XCircle className="size-10 text-destructive" aria-hidden />
              <div>
                <h1 className="text-xl font-medium text-destructive">
                  Verification failed
                </h1>
                <p className="mt-2 text-sm text-athens-body">{error}</p>
              </div>
              <Link
                href="/account"
                className={cn(buttonVariants({ variant: "default" }))}
              >
                Resend from your account
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
