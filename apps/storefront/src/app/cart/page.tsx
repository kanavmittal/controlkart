import type { Metadata } from "next"
import { CartView } from "./cart-view"

export const metadata: Metadata = {
  title: "Cart",
  robots: { index: false },
}

// Cart is user-specific and rendered client-side (CSR) via the Medusa SDK.
// This server shell only carries metadata; the cart UI is in <CartView />.
export default function CartPage() {
  return <CartView />
}
