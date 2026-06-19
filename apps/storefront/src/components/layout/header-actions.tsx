"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useCart } from "@/lib/hooks/use-cart"

/**
 * Cart/account state for the header. Cart count comes from the client cart
 * (useCart). Account state still comes from /api/account/summary in 2a; 2b
 * switches it to useCustomer() and retires the endpoint.
 */
export function HeaderActions() {
  const { itemCount } = useCart()
  const [account, setAccount] = useState<{
    firstName: string | null
    signedIn: boolean
  } | null>(null)

  useEffect(() => {
    let active = true
    fetch("/api/account/summary", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (active && d)
          setAccount({ firstName: d.firstName, signedIn: d.signedIn })
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="flex items-center gap-6 text-sm">
      <Link href="/account" className="hover:text-[var(--color-accent)]">
        {account?.signedIn ? account.firstName || "Account" : "Sign In"}
      </Link>
      <Link href="/cart" className="hover:text-[var(--color-accent)]">
        Cart{itemCount > 0 ? ` (${itemCount})` : ""}
      </Link>
    </div>
  )
}
