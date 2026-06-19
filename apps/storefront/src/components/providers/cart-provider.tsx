"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { getCartId, setCartId as persistCartId } from "@/lib/cart-store"

type CartIdContextValue = {
  cartId: string | null
  setCartId: (id: string) => void
  /** True once the id has been read from localStorage after mount. */
  hydrated: boolean
}

const CartIdContext = createContext<CartIdContextValue>({
  cartId: null,
  setCartId: () => {},
  hydrated: false,
})

/**
 * Holds the cart id in shared client state. Starts null on the server AND the
 * first client render (avoids hydration mismatch), then hydrates from
 * localStorage after mount. All cart consumers (header, cart page, PDP) share
 * this id so a cart created by add-to-cart is immediately visible everywhere.
 */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartId, setCartIdState] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setCartIdState(getCartId())
    setHydrated(true)
  }, [])

  const setCartId = (id: string) => {
    persistCartId(id)
    setCartIdState(id)
  }

  return (
    <CartIdContext.Provider value={{ cartId, setCartId, hydrated }}>
      {children}
    </CartIdContext.Provider>
  )
}

export const useCartId = () => useContext(CartIdContext)
