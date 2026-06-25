"use client"

import { createContext, useContext, useState } from "react"

type ProductSelectionValue = {
  selectedVariantId: string | undefined
  setSelectedVariantId: (id: string | undefined) => void
}

const ProductSelectionContext = createContext<ProductSelectionValue>({
  selectedVariantId: undefined,
  setSelectedVariantId: () => {},
})

/**
 * Shares the currently selected variant across the PDP so the image gallery
 * (left column) and the PurchasePanel (right column) — which live in separate
 * subtrees — stay in sync. Initialized from a prop so the server render and the
 * first client render agree (no hydration mismatch): `variants[0]?.id` is
 * deterministic from the same server-fetched product.
 */
export function ProductSelectionProvider({
  initialVariantId,
  children,
}: {
  initialVariantId: string | undefined
  children: React.ReactNode
}) {
  const [selectedVariantId, setSelectedVariantId] = useState(initialVariantId)
  return (
    <ProductSelectionContext.Provider
      value={{ selectedVariantId, setSelectedVariantId }}
    >
      {children}
    </ProductSelectionContext.Provider>
  )
}

export const useProductSelection = () => useContext(ProductSelectionContext)
