"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Lock, Truck } from "lucide-react"
import { Price } from "@/components/shared/price"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { useCheckout } from "./use-checkout"

function errorMessageOf(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback
}

export function ShippingSelector() {
  const { cart, shippingOptions, setShipping } = useCheckout()
  const selectedId = cart?.shipping_methods?.[0]?.shipping_option_id ?? undefined
  const options = shippingOptions.data ?? []

  if (shippingOptions.isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    )
  }
  if (!options.length) {
    return (
      <p className="text-sm text-athens-body">
        No shipping options available for this address.
      </p>
    )
  }

  return (
    <div className={cn("grid gap-2", setShipping.isPending && "opacity-50")}>
      {options.map((option) => {
        const selected = option.id === selectedId
        return (
          <button
            key={option.id}
            disabled={setShipping.isPending}
            onClick={() => setShipping.mutate(option.id)}
            className={cn(
              "flex items-start gap-3 rounded-[var(--radius)] border px-4 py-3 text-left text-sm transition-colors disabled:cursor-not-allowed",
              selected
                ? "border-primary bg-primary/5"
                : "border-athens-line hover:border-athens-dark"
            )}
          >
            <span
              aria-hidden
              className={cn(
                "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
                selected ? "border-primary" : "border-athens-line"
              )}
            >
              {selected && <span className="size-2 rounded-full bg-primary" />}
            </span>
            <span className="flex-1">
              <span
                className={cn(
                  "block",
                  selected ? "font-semibold text-primary" : "font-medium text-athens-dark"
                )}
              >
                {option.name}
              </span>
              {option.type?.description && (
                <span className="mt-0.5 flex items-center gap-1 text-xs text-athens-body">
                  <Truck className="size-3" aria-hidden />
                  {option.type.description}
                </span>
              )}
            </span>
            <Price
              amount={option.amount ?? 0}
              className="text-sm font-semibold text-athens-dark"
            />
          </button>
        )
      })}
      {setShipping.error && (
        <Alert variant="destructive">
          <AlertDescription>
            {errorMessageOf(setShipping.error, "Could not set shipping method.")}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void }
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true)
    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export function PlaceOrderButton() {
  const router = useRouter()
  const { cart, customer, initiatePayment, complete } = useCheckout()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function finalize() {
    const order = await complete()
    router.push(`/order-confirmed/${order.id}`)
  }

  async function onPlaceOrder() {
    setError(null)
    setPending(true)
    const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY
    try {
      const { providerId, sessionData } = await initiatePayment()

      if (providerId.startsWith("pp_razorpay") && razorpayKey) {
        const loaded = await loadRazorpayScript()
        if (!loaded || !window.Razorpay) {
          setError("Failed to load the payment gateway. Please retry.")
          setPending(false)
          return
        }
        const ship = cart?.shipping_address
        const razorpay = new window.Razorpay({
          key: razorpayKey,
          order_id: (sessionData.id as string) ?? undefined,
          name: "ControlKart",
          description: "Order payment",
          prefill: {
            name: [ship?.first_name, ship?.last_name].filter(Boolean).join(" "),
            email: customer?.email ?? undefined,
            contact: ship?.phone ?? undefined,
          },
          handler: async () => {
            try {
              await finalize()
            } catch (e) {
              setError(errorMessageOf(e, "Payment succeeded but the order could not be completed. Contact support."))
              setPending(false)
            }
          },
          modal: {
            ondismiss: () => {
              setError("Payment was cancelled.")
              setPending(false)
            },
          },
        })
        razorpay.open()
        return // stay pending until the handler or dismiss fires
      }

      // Dev / manual payment providers complete immediately
      await finalize()
    } catch (e) {
      setError(errorMessageOf(e, "Could not place the order. Please retry."))
      setPending(false)
    }
  }

  return (
    <div>
      <Button onClick={onPlaceOrder} disabled={pending} className="w-full">
        {pending && <Loader2 className="animate-spin" data-icon="inline-start" />}
        {pending ? "Processing…" : "Place Order"}
      </Button>
      {error && (
        <Alert variant="destructive" className="mt-2">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-athens-body">
        <Lock className="size-3" aria-hidden />
        Secure checkout
      </p>
    </div>
  )
}
