"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { formatINR } from "@/lib/format"
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
      <p className="text-sm text-[var(--color-ink-muted)]">
        Loading shipping options…
      </p>
    )
  }
  if (!options.length) {
    return (
      <p className="text-sm text-[var(--color-ink-muted)]">
        No shipping options available for this address.
      </p>
    )
  }

  return (
    <div className={`grid gap-2 ${setShipping.isPending ? "opacity-50" : ""}`}>
      {options.map((option) => (
        <button
          key={option.id}
          disabled={setShipping.isPending}
          onClick={() => setShipping.mutate(option.id)}
          className={`flex items-center justify-between border px-4 py-3 text-left text-sm transition-colors ${
            option.id === selectedId
              ? "border-[var(--color-line-strong)] bg-[var(--color-surface-alt)] font-medium"
              : "border-[var(--color-line)] hover:border-[var(--color-ink-faint)]"
          }`}
        >
          <span>{option.name}</span>
          <span className="font-semibold">{formatINR(option.amount ?? 0)}</span>
        </button>
      ))}
      {setShipping.error && (
        <p className="text-sm text-[var(--color-bad)]">
          {errorMessageOf(setShipping.error, "Could not set shipping method.")}
        </p>
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
      <button
        onClick={onPlaceOrder}
        disabled={pending}
        className="btn-primary w-full px-6 py-2.5"
      >
        {pending ? "Processing…" : "Place Order"}
      </button>
      {error && <p className="mt-2 text-sm text-[var(--color-bad)]">{error}</p>}
    </div>
  )
}
