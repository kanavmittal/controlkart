"use client"

import Link from "next/link"
import { useCart } from "@/lib/hooks/use-cart"
import { useCustomer } from "@/lib/hooks/use-customer"

/**
 * Cart/account state for the header — both fully client-side (CSR). Cart count
 * from useCart(); the signed-in customer from useCustomer() (Medusa SDK + the
 * localStorage JWT). No server endpoints involved.
 */
export function HeaderActions() {
  const { itemCount } = useCart()
  const { customer } = useCustomer()

  return (
    <div className="flex items-center gap-6 text-sm">
      <Link href="/account" className="hover:text-[var(--color-accent)]">
        {customer ? customer.first_name || "Account" : "Sign In"}
      </Link>
      <Link
        href="/cart"
        aria-live="polite"
        className="hover:text-[var(--color-accent)]"
      >
        Cart{itemCount > 0 ? ` (${itemCount})` : ""}
      </Link>
    </div>
  )
}
