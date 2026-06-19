import type { Metadata } from "next"
import { AddressesView } from "./addresses-view"

export const metadata: Metadata = {
  title: "Saved Addresses",
  robots: { index: false },
}

// User-specific page rendered client-side (CSR). The server shell only carries
// metadata; the UI + auth guard live in <AddressesView />.
export default function AddressesPage() {
  return <AddressesView />
}
