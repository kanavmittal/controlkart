"use client"

import type { HttpTypes } from "@medusajs/types"
import { useQuickView } from "@/components/providers/quick-view-provider"

/**
 * Overlay trigger rendered inside ProductCard. Sits above the card's <Link> and
 * cancels the navigation so a click opens the quick-view instead. Hidden until
 * card hover/keyboard focus on pointer devices; always visible on touch.
 */
export function QuickViewButton({
  product,
}: {
  product: HttpTypes.StoreProduct
}) {
  const { openQuickView } = useQuickView()
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        openQuickView(product)
      }}
      aria-label={`Quick view ${product.title}`}
      className="btn-secondary absolute right-3 top-3 z-10 px-3 py-1.5 text-xs opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
    >
      Quick view
    </button>
  )
}
