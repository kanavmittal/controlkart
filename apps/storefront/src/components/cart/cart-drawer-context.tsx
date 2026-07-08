"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

interface CartDrawerContextValue {
  open: boolean
  openDrawer: () => void
  closeDrawer: () => void
}

const CartDrawerContext = createContext<CartDrawerContextValue | null>(null)

// Fallback returned by `useCartDrawer()` when no `CartDrawerProvider` is
// mounted — old chrome (`layout/header.tsx` + friends) renders without the
// provider until T14 swaps the layout over, so any caller (e.g. an
// add-to-cart button ported early) must be able to call `openDrawer()`
// harmlessly instead of crashing.
const NOOP_CART_DRAWER: CartDrawerContextValue = {
  open: false,
  openDrawer: () => {},
  closeDrawer: () => {},
}

/**
 * Tiny UI-only context for the shared cart drawer's open/closed state. Holds
 * no cart data itself — line items and mutations are read directly from
 * `useCart()` (`lib/hooks/use-cart.ts`) by `CartDrawer`. Keeping this
 * separate means any component can request `openDrawer()` without pulling
 * in cart data-fetching.
 */
export function CartDrawerProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <CartDrawerContext.Provider
      value={{
        open,
        openDrawer: () => setOpen(true),
        closeDrawer: () => setOpen(false),
      }}
    >
      {children}
    </CartDrawerContext.Provider>
  )
}

/**
 * Reads/controls the shared cart drawer. Safe to call from anywhere —
 * returns a no-op fallback (drawer reads as closed, open/close are no-ops)
 * when rendered outside `CartDrawerProvider` instead of throwing, so
 * pre-T14 chrome and any early caller never crash.
 */
export function useCartDrawer(): CartDrawerContextValue {
  const ctx = useContext(CartDrawerContext)
  return ctx ?? NOOP_CART_DRAWER
}
