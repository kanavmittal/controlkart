"use client"

import { Eye } from "lucide-react"
import type { HttpTypes } from "@medusajs/types"

import { Button } from "@/components/ui/button"
import { useQuickView } from "@/components/providers/quick-view-provider"

/**
 * Overlay trigger for the NEW `ProductCard`'s `quickViewSlot` (see
 * `product/product-card.tsx`). Sits above the card's `<Link>`, so the click
 * must stop propagation/prevent default or the card navigation fires too.
 * Replaces the old `products/quick-view-button.tsx` (kept for now — it's
 * still used by the old `products/product-card.tsx` until T57).
 */
export function QuickViewButton({
  product,
}: {
  product: HttpTypes.StoreProduct
}) {
  const { openQuickView } = useQuickView()
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="bg-white shadow-sm"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        openQuickView(product)
      }}
      aria-label={`Quick view ${product.title}`}
    >
      <Eye aria-hidden />
      Quick view
    </Button>
  )
}
