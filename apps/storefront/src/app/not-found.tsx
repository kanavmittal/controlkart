import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Global 404 — rendered whenever `notFound()` is called (category/PDP/blog
// post/info page lookups) or an unknown URL is hit directly. Athens-styled
// per T14; no clone equivalent (Next-specific file), so this follows the
// same `.athens-container` + heading/blurb + button-pair pattern used across
// the storefront's other state screens (e.g. cart drawer empty state).
export default function NotFound() {
  return (
    <div className="athens-container flex min-h-[60vh] flex-col items-center justify-center gap-4 py-24 text-center">
      <p className="text-sm font-medium tracking-wide text-athens-body uppercase">
        404
      </p>
      <h1 className="text-3xl font-bold text-athens-dark sm:text-4xl">
        Page not found
      </h1>
      <p className="max-w-md text-athens-body">
        The page you&apos;re looking for doesn&apos;t exist or may have been
        moved. Try heading back home or browsing the catalog.
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className={cn(buttonVariants({ variant: "default" }))}>
          Back to home
        </Link>
        <Link
          href="/products"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Browse products
        </Link>
      </div>
    </div>
  )
}
