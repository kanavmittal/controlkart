"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"

import { useCustomer } from "@/lib/hooks/use-customer"
import { useAddresses } from "@/lib/hooks/use-addresses"
import type { CustomerAddress } from "@/lib/address-utils"
import { Breadcrumbs } from "@/components/shared/breadcrumbs"
import { Button } from "@/components/ui/button"
import { AddressManager } from "./address-manager"

/**
 * Client-side saved-addresses page (CSR) with an auth guard. Logic
 * untouched from the pre-restyle version: `useCustomer()` gates access and
 * redirects unauthenticated visitors to `/account?redirect=/account/addresses`
 * (same contract `use-checkout`/other account pages rely on); `useAddresses()`
 * supplies the list + loading state consumed here, with `save`/`remove`
 * mutations owned by `<AddressManager />`.
 */
export function AddressesView() {
  const router = useRouter()
  const { customer, isLoading: customerLoading } = useCustomer()
  const { addresses, isLoading: addressesLoading } = useAddresses()
  const [editing, setEditing] = useState<CustomerAddress | "new" | null>(null)

  useEffect(() => {
    if (!customerLoading && !customer) {
      router.replace("/account?redirect=/account/addresses")
    }
  }, [customer, customerLoading, router])

  if (customerLoading || !customer) {
    return (
      <div className="athens-container py-20 text-center text-sm text-athens-body">
        Loading…
      </div>
    )
  }

  return (
    <>
      <Breadcrumbs
        crumbs={[
          { label: "Account", href: "/account" },
          { label: "Addresses" },
        ]}
      />
      <div className="athens-container py-10 md:py-12">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="athens-page-title">
              Saved Addresses
            </h1>
            <p className="mt-2 max-w-xl text-sm text-athens-body">
              Manage delivery and billing addresses. Your default shipping
              address is pre-selected at checkout. You can also choose a
              different billing address when placing an order.
            </p>
          </div>
          <Button type="button" onClick={() => setEditing("new")}>
            <Plus aria-hidden />
            Add address
          </Button>
        </div>

        <div className="mt-8">
          {addressesLoading ? (
            <p className="text-sm text-athens-body">Loading addresses…</p>
          ) : (
            <AddressManager
              addresses={addresses}
              editing={editing}
              onEditingChange={setEditing}
            />
          )}
        </div>
      </div>
    </>
  )
}
