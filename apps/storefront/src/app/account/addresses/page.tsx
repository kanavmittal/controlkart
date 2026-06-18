import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getCustomer } from "@/lib/data/auth"
import { listCustomerAddresses } from "@/lib/data/addresses"
import { AddressManager } from "./address-manager"

export const metadata: Metadata = {
  title: "Saved Addresses",
  robots: { index: false },
}

export const dynamic = "force-dynamic"

export default async function AddressesPage() {
  const customer = await getCustomer()
  if (!customer) redirect("/account?redirect=/account/addresses")

  const addresses = await listCustomerAddresses()

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
        <AddressManager addresses={addresses} />
      </div>
    </div>
  )
}
