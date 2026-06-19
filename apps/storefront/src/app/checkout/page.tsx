import type { Metadata } from "next"
import { CheckoutView } from "./checkout-view"

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false },
}

// Checkout is user + cart specific and rendered client-side (CSR) via the Medusa
// SDK. The server shell only carries metadata; the flow lives in <CheckoutView />.
export default function CheckoutPage() {
  return <CheckoutView />
}
