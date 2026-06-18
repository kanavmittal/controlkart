"use client"

import { useActionState } from "react"
import { quickOrderToCart } from "@/lib/data/quick-order"

export function QuickOrderForm() {
  const [state, action, pending] = useActionState(quickOrderToCart, undefined)

  return (
    <form action={action}>
      <textarea
        name="items"
        rows={8}
        required
        placeholder={"SKU, quantity\nMIBRX-6M-1-1-1-230V, 5"}
        className="w-full border border-[var(--color-line)] p-3 font-mono text-sm outline-none focus:border-[var(--color-line-strong)]"
      />
      {state?.error && (
        <p className="mt-2 text-sm text-[var(--color-bad)]">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="btn-primary mt-4 px-6 py-2.5"
      >
        {pending ? "Validating…" : "Add All to Cart"}
      </button>
    </form>
  )
}
