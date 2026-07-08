"use client"

import { useEffect } from "react"
import Link from "next/link"

import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Global error boundary — Next requires this to be a Client Component.
// Athens-styled per T14; no clone equivalent (Next-specific file). Mirrors
// `not-found.tsx`'s layout with a `reset()`-driven retry action.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="athens-container flex min-h-[60vh] flex-col items-center justify-center gap-4 py-24 text-center">
      <p className="text-sm font-medium tracking-wide text-athens-body uppercase">
        Error
      </p>
      <h1 className="text-3xl font-bold text-athens-dark sm:text-4xl">
        Something went wrong
      </h1>
      <p className="max-w-md text-athens-body">
        We hit an unexpected error loading this page. You can try again, or
        head back home.
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <Button type="button" variant="default" onClick={() => reset()}>
          Try again
        </Button>
        <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
          Back to home
        </Link>
      </div>
    </div>
  )
}
