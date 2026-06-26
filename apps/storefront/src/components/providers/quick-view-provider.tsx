"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import dynamic from "next/dynamic"
import type { HttpTypes } from "@medusajs/types"

// Code-split: the modal chunk loads only after the first Quick view click.
const QuickViewModal = dynamic(
  () => import("@/components/products/quick-view-modal"),
  { ssr: false }
)

type QuickViewContextValue = {
  openQuickView: (product: HttpTypes.StoreProduct) => void
  closeQuickView: () => void
}

const QuickViewContext = createContext<QuickViewContextValue | null>(null)

export function useQuickView() {
  const ctx = useContext(QuickViewContext)
  if (!ctx) {
    throw new Error("useQuickView must be used within QuickViewProvider")
  }
  return ctx
}

/**
 * Mounts a single shared quick-view modal for the whole app. The modal chunk is
 * lazy-mounted on first open and then kept mounted (visibility driven by the
 * `product` state) so the React Query cache for a product survives reopen.
 */
export function QuickViewProvider({ children }: { children: ReactNode }) {
  const [product, setProduct] = useState<HttpTypes.StoreProduct | null>(null)
  const [mounted, setMounted] = useState(false)

  const openQuickView = (p: HttpTypes.StoreProduct) => {
    setMounted(true)
    setProduct(p)
  }
  const closeQuickView = () => setProduct(null)

  return (
    <QuickViewContext.Provider value={{ openQuickView, closeQuickView }}>
      {children}
      {mounted && <QuickViewModal product={product} onClose={closeQuickView} />}
    </QuickViewContext.Provider>
  )
}
