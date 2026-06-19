"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCustomer } from "@/lib/hooks/use-customer"
import { useAddresses } from "@/lib/hooks/use-addresses"
import { AddressManager } from "./address-manager"

/** Client-side saved-addresses page (CSR) with an auth guard. */
export function AddressesView() {
  const router = useRouter()
  const { customer, isLoading: customerLoading } = useCustomer()
  const { addresses, isLoading: addressesLoading } = useAddresses()

  useEffect(() => {
    if (!customerLoading && !customer) {
      router.replace("/account?redirect=/account/addresses")
    }
  }, [customer, customerLoading, router])

  if (customerLoading || !customer) {
    return (
      <div className="shell py-20 text-center text-sm text-[var(--color-ink-muted)]">
        Loading…
      </div>
    )
  }

  return (
    <div className="shell py-12">
      <Link
        href="/account"
        className="text-sm text-[var(--color-accent)] hover:underline"
      >
        ← Back to Account
      </Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">Saved Addresses</h1>
      <p className="mt-2 max-w-xl text-sm text-[var(--color-ink-muted)]">
        Manage delivery and billing addresses. Your default shipping address
        is pre-selected at checkout. You can also choose a different billing
        address when placing an order.
      </p>
      <div className="mt-8">
        {addressesLoading ? (
          <p className="text-sm text-[var(--color-ink-muted)]">
            Loading addresses…
          </p>
        ) : (
          <AddressManager addresses={addresses} />
        )}
      </div>
    </div>
  )
}
