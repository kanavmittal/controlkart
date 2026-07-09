"use client"

import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { useCartDrawer } from "@/components/cart/cart-drawer-context"
import { useCart } from "@/lib/hooks/use-cart"

interface ProductCardActionsProps {
  variantId: string
  productTitle: string
  className?: string
}

/**
 * Client-only leaf of the product card: the single-variant "Add to cart"
 * CTA. Split out of `product-card.tsx` so the card itself stays a
 * server-renderable shell — only this button needs `useCart()`'s mutation,
 * the sonner toast, and the cart drawer's open/close context.
 *
 * `useCartDrawer()` safely no-ops when rendered outside a
 * `CartDrawerProvider` (see `cart/cart-drawer-context.tsx`), so this card
 * can be reused anywhere in the tree without crashing.
 */
export function ProductCardActions({
  variantId,
  productTitle,
  className,
}: ProductCardActionsProps) {
  const { addItem } = useCart()
  const { openDrawer } = useCartDrawer()

  const onAddToCart = () => {
    addItem.mutate(
      { variantId, quantity: 1 },
      {
        onSuccess: () => {
          toast.success(`Added ${productTitle} to cart`)
          openDrawer()
        },
        onError: () => {
          toast.error("Couldn't add to cart. Please try again.")
        },
      }
    )
  }

  return (
    <Button
      type="button"
      variant="secondary"
      className={className ?? "w-full"}
      onClick={onAddToCart}
      disabled={addItem.isPending}
      aria-busy={addItem.isPending}
    >
      {addItem.isPending ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Adding…
        </>
      ) : (
        "Add to cart"
      )}
    </Button>
  )
}
