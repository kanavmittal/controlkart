"use client"

import { useCart } from "@/lib/hooks/use-cart"

export function CartLineControls({
  lineId,
  quantity,
}: {
  lineId: string
  quantity: number
}) {
  const { updateItem } = useCart()
  const pending = updateItem.isPending
  const set = (qty: number) => updateItem.mutate({ lineId, quantity: qty })

  return (
    <div className={`flex items-center gap-2 ${pending ? "opacity-50" : ""}`}>
      <div className="flex border border-[var(--color-line)]">
        <button
          onClick={() => set(quantity - 1)}
          disabled={pending}
          className="px-2.5 py-1 text-sm"
          aria-label="Decrease quantity"
        >
          −
        </button>
        <span className="flex w-10 items-center justify-center border-x border-[var(--color-line)] text-sm">
          {quantity}
        </span>
        <button
          onClick={() => set(quantity + 1)}
          disabled={pending}
          className="px-2.5 py-1 text-sm"
          aria-label="Increase quantity"
        >
          +
        </button>
      </div>
      <button
        onClick={() => set(0)}
        disabled={pending}
        className="text-xs text-[var(--color-ink-muted)] underline hover:text-[var(--color-bad)]"
      >
        Remove
      </button>
    </div>
  )
}
