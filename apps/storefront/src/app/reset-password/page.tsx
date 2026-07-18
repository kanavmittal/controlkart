import type { Metadata } from "next"
import { Suspense } from "react"
import { ResetPasswordView } from "./reset-password-view"

export const metadata: Metadata = {
  title: "Reset Password",
  robots: { index: false },
}

// The form is client-side (SDK + ?token=); this shell carries metadata.
export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordView />
    </Suspense>
  )
}
