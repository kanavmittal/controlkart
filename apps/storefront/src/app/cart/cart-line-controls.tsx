"use client"

import { Minus, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useCart } from "@/lib/hooks/use-cart"
import { cn } from "@/lib/utils"

/**
 * Line-level controls for the full cart page: qty stepper (outline icon
 * `Button`s + numeric display) + remove. Mutation logic is untouched from
 * the pre-restyle version — `useCart().updateItem` is optimistic and
 * quantity <= 0 removes the line (see `lib/hooks/use-cart.ts`); this
 * component only decides *what* quantity to send.
 */
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
    <div className={cn("flex items-center gap-3", pending && "opacity-50")}>
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="icon-xs"
          disabled={pending}
          aria-label="Decrease quantity"
          onClick={() => set(quantity - 1)}
        >
          <Minus />
        </Button>
        <span
          className="w-8 text-center text-sm tabular-nums text-athens-dark"
          aria-live="polite"
        >
          {quantity}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon-xs"
          disabled={pending}
          aria-label="Increase quantity"
          onClick={() => set(quantity + 1)}
        >
          <Plus />
        </Button>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        disabled={pending}
        aria-label="Remove item"
        onClick={() => set(0)}
        className="border-0"
      >
        <Trash2 />
      </Button>
    </div>
  )
}
