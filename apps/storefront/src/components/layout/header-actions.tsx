"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

type Summary = { itemCount: number; firstName: string | null; signedIn: boolean }

/**
 * Client-side cart/account state. Fetched after load so the Header (and every
 * page that renders it) can be statically pre-rendered for SEO. Shows the
 * signed-out default until the summary resolves.
 */
export function HeaderActions() {
  const [summary, setSummary] = useState<Summary | null>(null)

  useEffect(() => {
    let active = true
    fetch("/api/account/summary", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Summary | null) => {
        if (active && d) setSummary(d)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const itemCount = summary?.itemCount ?? 0

  return (
    <div className="flex items-center gap-6 text-sm">
      <Link href="/account" className="hover:text-[var(--color-accent)]">
        {summary?.signedIn ? summary.firstName || "Account" : "Sign In"}
      </Link>
      <Link href="/cart" className="hover:text-[var(--color-accent)]">
        Cart{itemCount > 0 ? ` (${itemCount})` : ""}
      </Link>
    </div>
  )
}
