"use client"

import { useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CheckCircle2, LogIn, MailWarning } from "lucide-react"

import { useCart } from "@/lib/hooks/use-cart"
import { useCustomer } from "@/lib/hooks/use-customer"
import { useAddresses } from "@/lib/hooks/use-addresses"
import { useCartId } from "@/components/providers/cart-provider"
import { isEmailVerified } from "@/lib/customer"
import { formatINR } from "@/lib/format"
import { Price } from "@/components/shared/price"
import { Breadcrumbs } from "@/components/shared/breadcrumbs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { ShippingSelector, PlaceOrderButton } from "./checkout-controls"
import { CheckoutAddressForm } from "./checkout-address-form"

const CHECKOUT_CRUMBS = [{ label: "Cart", href: "/cart" }, { label: "Checkout" }]

/**
 * Client-side checkout shell (CSR). Presentation only — `useCheckout()` lives
 * in `use-checkout.ts` (untouched) and is consumed by the still-unstyled
 * child steps (`checkout-address-form.tsx`, `checkout-controls.tsx`, T32/T33).
 * This file owns: the cart/auth guards + redirects (logic verbatim from the
 * pre-restyle version, split across two early returns instead of one
 * combined loading string so the auth guard can render a styled notice), the
 * 2-col layout, the step indicator, and the order-summary card. The gating
 * booleans (`hasAddress`, `hasShipping`) are unchanged and are the ONLY
 * inputs to both the step indicator and which child section renders.
 */
export function CheckoutView() {
  const router = useRouter()
  const { hydrated, cartId } = useCartId()
  const { cart, isLoading: cartLoading } = useCart()
  const { customer, isLoading: custLoading } = useCustomer()
  const { addresses } = useAddresses()

  const ready = hydrated && !cartLoading && !custLoading
  const cartEmpty = !cart || !cart.items?.length
  const verified = isEmailVerified(customer)

  useEffect(() => {
    if (!ready) return
    if (!cartId || cartEmpty) {
      router.replace("/cart")
      return
    }
    if (!customer || !verified) {
      router.replace("/account?redirect=/checkout")
    }
  }, [ready, cartId, cartEmpty, customer, verified, router])

  // Still loading, or about to redirect to /cart (empty/missing cart) — same
  // "don't render the real steps yet" branch as before, restyled with
  // Skeleton instead of a loading string.
  if (!ready || !cartId || cartEmpty || !cart) {
    return <CheckoutSkeleton />
  }

  // About to redirect to /account?redirect=/checkout — restyled from a bare
  // loading string into a styled warning Alert with a Sign-in CTA. The
  // redirect effect above still fires; this is what's visible in the beat
  // before navigation completes.
  if (!customer || !verified) {
    return <AuthGuardNotice signedIn={!!customer} />
  }

  const hasAddress = !!cart.shipping_address?.postal_code
  const hasShipping = !!cart.shipping_methods?.length

  const addressState: StepState = hasAddress ? "complete" : "current"
  const shippingState: StepState = !hasAddress
    ? "upcoming"
    : hasShipping
      ? "complete"
      : "current"
  const paymentState: StepState = hasShipping ? "current" : "upcoming"

  return (
    <>
      <Breadcrumbs crumbs={CHECKOUT_CRUMBS} />
      <div className="athens-container py-10 md:py-12">
        <h1 className="athens-page-title">Checkout</h1>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
          <div>
            <StepIndicator
              states={[addressState, shippingState, paymentState]}
            />

            <div className="mt-6 space-y-6">
              <Card size="sm">
                <CardHeader>
                  <CardTitle>Delivery &amp; billing</CardTitle>
                </CardHeader>
                <CardContent>
                  <CheckoutAddressForm
                    savedAddresses={addresses}
                    cartShipping={cart.shipping_address}
                    cartBilling={cart.billing_address}
                    customerDefaults={{
                      first_name: customer.first_name,
                      last_name: customer.last_name,
                      phone: customer.phone,
                    }}
                    gstin={(cart.metadata?.gstin as string) ?? ""}
                    hasAddress={hasAddress}
                  />
                </CardContent>
              </Card>

              {hasAddress && (
                <Card size="sm">
                  <CardHeader>
                    <CardTitle>Shipping method</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ShippingSelector />
                  </CardContent>
                </Card>
              )}

              {hasShipping && (
                <Card size="sm">
                  <CardHeader>
                    <CardTitle>Payment</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-athens-body">
                      Pay securely via Razorpay - UPI, credit/debit cards and
                      net banking supported.
                    </p>
                    <PlaceOrderButton />
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          <Card size="sm" className="h-fit lg:sticky lg:top-24">
            <CardHeader>
              <CardTitle>Order summary</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 border-b border-athens-line pb-4">
                {cart.items?.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="relative size-14 shrink-0 overflow-hidden rounded-[var(--radius)] border border-athens-line bg-athens-band">
                      {item.thumbnail ? (
                        <Image
                          src={item.thumbnail}
                          alt={item.product_title ?? item.title}
                          fill
                          className="object-contain p-1.5"
                          sizes="56px"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-athens-dark">
                        {item.product_title}
                      </p>
                      <p className="font-mono text-xs text-athens-body">
                        {item.variant?.sku ? `${item.variant.sku} · ` : null}
                        Qty {item.quantity}
                      </p>
                    </div>
                    <Price
                      amount={item.total}
                      className="text-sm font-medium text-athens-dark"
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-baseline justify-between text-sm">
                <span className="text-athens-body">Subtotal (incl. GST)</span>
                <Price
                  amount={cart.item_total}
                  className="text-sm leading-none font-normal text-athens-dark"
                />
              </div>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-athens-body">GST included</span>
                <Price
                  amount={cart.tax_total}
                  className="text-sm leading-none font-normal text-athens-dark"
                />
              </div>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-athens-body">Shipping</span>
                <Price
                  amount={cart.shipping_total}
                  className="text-sm leading-none font-normal text-athens-dark"
                />
              </div>
              {(cart.discount_total ?? 0) > 0 ? (
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-athens-success">Discount</span>
                  <span className="text-sm leading-none font-normal text-athens-success">
                    −{formatINR(cart.discount_total)}
                  </span>
                </div>
              ) : null}
              <div className="flex items-baseline justify-between border-t border-athens-line pt-3 text-base font-semibold">
                <span className="text-athens-dark">Total</span>
                <Price
                  amount={cart.total}
                  className="text-base leading-none font-semibold text-athens-dark"
                />
              </div>
              <p className="text-xs text-athens-body">
                All prices include GST.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}

type StepState = "complete" | "current" | "upcoming"

const STEPS: { n: 1 | 2 | 3; label: string }[] = [
  { n: 1, label: "Address" },
  { n: 2, label: "Shipping" },
  { n: 3, label: "Payment" },
]

const STEP_CIRCLE_CLASS: Record<StepState, string> = {
  complete: "border-athens-success bg-athens-success text-white",
  current: "border-athens-blue bg-white text-athens-blue font-semibold",
  upcoming: "border-athens-line bg-white text-athens-body",
}

const STEP_LABEL_CLASS: Record<StepState, string> = {
  complete: "text-athens-dark font-medium",
  current: "text-athens-blue font-semibold",
  upcoming: "text-athens-body",
}

// Step indicator across the top of the left column. States derive purely
// from `hasAddress`/`hasShipping` — the same booleans that gate which child
// section renders below — so the indicator can never disagree with the
// steps actually on screen.
function StepIndicator({
  states,
}: {
  states: [StepState, StepState, StepState]
}) {
  return (
    <ol className="flex items-center" aria-label="Checkout progress">
      {STEPS.map((step, i) => {
        const state = states[i]
        return (
          <li
            key={step.n}
            className={cn(
              "flex items-center",
              i < STEPS.length - 1 && "flex-1"
            )}
          >
            <span className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full border text-sm",
                  STEP_CIRCLE_CLASS[state]
                )}
              >
                {state === "complete" ? (
                  <CheckCircle2 className="size-4" aria-hidden />
                ) : (
                  step.n
                )}
              </span>
              <span className={cn("text-sm whitespace-nowrap", STEP_LABEL_CLASS[state])}>
                {step.label}
              </span>
            </span>
            {i < STEPS.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  "mx-3 h-px flex-1",
                  state === "complete" ? "bg-athens-success" : "bg-athens-line"
                )}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}

// Warning-tint guard notice shown while the redirect-to-/account effect is
// in flight. `signedIn` distinguishes the two guard reasons collapsed into
// the same `!customer || !verified` condition; copy for the verification
// case matches `account/verification-banner.tsx` verbatim.
function AuthGuardNotice({ signedIn }: { signedIn: boolean }) {
  return (
    <>
      <Breadcrumbs crumbs={CHECKOUT_CRUMBS} />
      <div className="athens-container py-10 md:py-12">
        <h1 className="athens-page-title">Checkout</h1>
        <Alert className="mt-6 max-w-xl border-athens-warning/40 bg-athens-warning-bg">
          {signedIn ? (
            <>
              <MailWarning className="text-athens-warning" aria-hidden />
              <AlertTitle className="text-athens-warning">
                Please verify your email before placing an order
              </AlertTitle>
              <AlertDescription className="text-athens-body">
                We sent a verification link to your inbox. Check spam if you
                do not see it within a few minutes.
              </AlertDescription>
            </>
          ) : (
            <>
              <LogIn className="text-athens-warning" aria-hidden />
              <AlertTitle className="text-athens-warning">
                Sign in required
              </AlertTitle>
              <AlertDescription className="text-athens-body">
                An account is required to complete checkout.
              </AlertDescription>
            </>
          )}
          <Button
            size="sm"
            className="mt-3"
            render={<Link href="/account?redirect=/checkout" />}
          >
            {signedIn ? "Go to your account" : "Sign in"}
          </Button>
        </Alert>
      </div>
    </>
  )
}

// Loading / about-to-redirect-to-/cart state. Same semantics as the
// pre-restyle "Loading checkout…" string, restyled as a skeleton of the
// real 2-col layout instead of a bare loading string.
function CheckoutSkeleton() {
  return (
    <>
      <Breadcrumbs crumbs={CHECKOUT_CRUMBS} />
      <div className="athens-container py-10 md:py-12">
        <Skeleton className="h-9 w-40" />
        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
          <div>
            <div className="flex items-center gap-3">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-px flex-1" />
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-px flex-1" />
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Card size="sm" className="mt-6">
              <CardHeader>
                <Skeleton className="h-5 w-40" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          </div>
          <Card size="sm" className="h-fit">
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-6 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
