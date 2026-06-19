import type { Metadata } from "next"
import { Suspense } from "react"
import { AccountView } from "./account-view"

export const metadata: Metadata = {
  title: "Account",
  robots: { index: false },
}

// Account is user-specific and rendered client-side (CSR) via the Medusa SDK.
// This server shell only carries metadata; the UI is in <AccountView />.
export default function AccountPage() {
  return (
    <Suspense>
      <AccountView />
    </Suspense>
  )
}
