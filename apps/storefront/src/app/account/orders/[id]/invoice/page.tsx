import type { Metadata } from "next"
import { InvoiceView } from "./invoice-view"

export const metadata: Metadata = {
  title: "Tax Invoice",
  robots: { index: false },
}

// Invoice is customer-specific and rendered client-side (CSR) via the Medusa
// SDK (the JWT is auto-attached from localStorage). Shell carries metadata only.
export default function InvoicePage() {
  return <InvoiceView />
}
