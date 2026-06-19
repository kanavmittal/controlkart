"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useCustomer, useAuthMutations } from "@/lib/hooks/use-customer"
import { useOrders } from "@/lib/hooks/use-orders"
import { isEmailVerified } from "@/lib/customer"
import { formatINR, formatDate } from "@/lib/format"
import { AuthForms } from "./auth-forms"
import { VerificationBanner } from "./verification-banner"

/** Client-side account dashboard (CSR). Reads the signed-in customer + orders. */
export function AccountView() {
  const { customer, isLoading } = useCustomer()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirect") ?? undefined
  const error = searchParams.get("error") ?? undefined
  const verify = searchParams.get("verify") ?? undefined

  if (isLoading) {
    return (
      <div className="shell py-20 text-center text-sm text-[var(--color-ink-muted)]">
        Loading your account…
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="shell py-12">
        <div className="mx-auto max-w-md">
          <h1 className="text-3xl font-bold tracking-tight">Sign In</h1>
          <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
            An account is required to purchase. Sign in or create an account
            in under a minute.
          </p>
          <div className="mt-8">
            <AuthForms redirectTo={redirectTo} errorMessage={error} />
          </div>
        </div>
      </div>
    )
  }

  return <AccountDashboard verify={verify} />
}

function AccountDashboard({ verify }: { verify?: string }) {
  const { customer } = useCustomer()
  const { logout } = useAuthMutations()
  const { orders } = useOrders()

  if (!customer) return null

  const verified = isEmailVerified(customer)

  return (
    <div className="shell py-12">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {customer.first_name
              ? `Hello, ${customer.first_name}`
              : "My Account"}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            {customer.email}
            {verified && (
              <span className="ml-2 text-[var(--color-ok)]">· Verified</span>
            )}
          </p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            logout.mutate()
          }}
        >
          <button type="submit" className="btn-secondary px-4 py-2 text-sm">
            Sign Out
          </button>
        </form>
      </div>

      {!verified && <VerificationBanner />}

      {verify === "sent" && !verified && (
        <div className="mt-4 border border-[var(--color-ok)] bg-[var(--color-surface-alt)] p-4 text-sm">
          Account created. Check your email for a verification link.
        </div>
      )}

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Order History</h2>
          <Link
            href="/account/addresses"
            className="text-sm text-[var(--color-accent)] hover:underline"
          >
            Manage addresses
          </Link>
        </div>
        {orders.length ? (
          <div className="mt-4 border border-[var(--color-line)]">
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 border-b border-[var(--color-line)] bg-[var(--color-surface-alt)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
              <span>Order</span>
              <span>Items</span>
              <span>Date</span>
              <span className="text-right">Total</span>
              <span />
            </div>
            {orders.map((order) => (
              <div
                key={order.id}
                className="group relative grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 border-b border-[var(--color-line)] px-4 py-3 text-sm last:border-b-0"
              >
                <Link
                  href={`/account/orders/${order.id}`}
                  className="absolute inset-0 z-0 rounded-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-accent)] group-hover:bg-[var(--color-surface-alt)]"
                  aria-label={`View order #${order.display_id}`}
                />
                <span className="pointer-events-none relative z-10 font-mono text-xs">
                  #{order.display_id}
                </span>
                <span className="pointer-events-none relative z-10 truncate text-[var(--color-ink-muted)]">
                  {order.items?.map((i) => i.title).join(", ")}
                </span>
                <span className="pointer-events-none relative z-10 text-xs text-[var(--color-ink-muted)]">
                  {formatDate(order.created_at as string)}
                </span>
                <span className="pointer-events-none relative z-10 text-right font-semibold">
                  {formatINR(order.total)}
                </span>
                <Link
                  href={`/account/orders/${order.id}/invoice`}
                  className="relative z-20 text-right text-xs text-[var(--color-accent)] hover:underline"
                >
                  Invoice
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-[var(--color-ink-muted)]">
            No orders yet.
          </p>
        )}
      </section>
    </div>
  )
}
