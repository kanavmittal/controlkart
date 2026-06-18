"use client"

import { useState, useTransition } from "react"
import {
  setShippingMethod,
  initiatePayment,
  placeOrder,
} from "@/lib/data/cart"
import { formatINR } from "@/lib/format"

export function ShippingSelector({
  options,
  selectedId,
}: {
  options: { id: string; name: string; amount: number }[]
  selectedId?: string
}) {
  const [pending, startTransition] = useTransition()

  if (!options.length) {
    return (
      <p className="text-sm text-[var(--color-ink-muted)]">
        No shipping options available for this address.
      </p>
    )
  }

  return (
    <div className={`grid gap-2 ${pending ? "opacity-50" : ""}`}>
      {options.map((option) => (
        <button
          key={option.id}
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await setShippingMethod(option.id)
            })
          }
          className={`flex items-center justify-between border px-4 py-3 text-left text-sm transition-colors ${
            option.id === selectedId
              ? "border-[var(--color-line-strong)] bg-[var(--color-surface-alt)] font-medium"
              : "border-[var(--color-line)] hover:border-[var(--color-ink-faint)]"
          }`}
        >
          <span>{option.name}</span>
          <span className="font-semibold">{formatINR(option.amount)}</span>
        </button>
      ))}
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
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const completeOrder = async () => {
    try {
      await placeOrder()
    } catch (e) {
      // redirect() throws internally; only surface real errors
      if (e instanceof Error && !e.message.includes("NEXT_REDIRECT")) {
        setError(e.message)
      } else {
        throw e
      }
    }
  }

  const onPlaceOrder = () =>
    startTransition(async () => {
      setError(null)
      const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY
      try {
        const { provider_id, session_data } = await initiatePayment()

        if (provider_id.startsWith("pp_razorpay") && razorpayKey) {
          const loaded = await loadRazorpayScript()
          if (!loaded || !window.Razorpay) {
            setError("Failed to load payment gateway. Please retry.")
            return
          }
          const razorpay = new window.Razorpay({
            key: razorpayKey,
            order_id: (session_data.id as string) ?? undefined,
            name: "ControlKart",
            description: "Order payment",
            handler: () => startTransition(completeOrder),
            modal: { ondismiss: () => setError("Payment was cancelled.") },
          })
          razorpay.open()
          return
        }

        // Dev / manual payment providers complete immediately
        await completeOrder()
      } catch (e) {
        if (e instanceof Error && !e.message.includes("NEXT_REDIRECT")) {
          setError(e.message)
        } else {
          throw e
        }
      }
    })

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
