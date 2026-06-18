import type { Metadata } from "next"
import { redirect } from "next/navigation"
import {
  retrieveCart,
  listShippingOptions,
} from "@/lib/data/cart"
import { getCustomer } from "@/lib/data/auth"
import { listCustomerAddresses } from "@/lib/data/addresses"
import { isEmailVerified } from "@/lib/customer"
import { formatINR } from "@/lib/format"
import { ShippingSelector, PlaceOrderButton } from "./checkout-controls"
import { CheckoutAddressForm } from "./checkout-address-form"

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false },
}

export const dynamic = "force-dynamic"

export default async function CheckoutPage() {
  const [cart, customer, savedAddresses] = await Promise.all([
    retrieveCart(),
    getCustomer(),
    listCustomerAddresses(),
  ])

  if (!cart?.items?.length) redirect("/cart")
  if (!customer) redirect("/account?redirect=/checkout")
  if (!isEmailVerified(customer)) redirect("/account?redirect=/checkout")

  const hasAddress = !!cart.shipping_address?.postal_code
  const shippingOptions = hasAddress ? await listShippingOptions() : []
  const hasShipping = !!cart.shipping_methods?.length

  return (
    <div className="shell py-12">
      <h1 className="text-3xl font-bold tracking-tight">Checkout</h1>
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
        <div className="space-y-10">
          <section className="border border-[var(--color-line)]">
            <div className="border-b border-[var(--color-line)] bg-[var(--color-surface-alt)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
              1. Delivery & Billing {hasAddress && "✓"}
            </div>
            <CheckoutAddressForm
              savedAddresses={savedAddresses}
              cartShipping={cart.shipping_address}
              cartBilling={cart.billing_address}
              customerDefaults={{
                first_name: customer.first_name,
                last_name: customer.last_name,
                phone: customer.phone,
              }}
              gstin={(cart.metadata?.gstin as string) ?? ""}
              hasAddress={hasAddress}
            />
          </section>

          {hasAddress && (
            <section className="border border-[var(--color-line)]">
              <div className="border-b border-[var(--color-line)] bg-[var(--color-surface-alt)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
                2. Shipping Method {hasShipping && "✓"}
              </div>
              <div className="p-4">
                <ShippingSelector
                  options={shippingOptions.map((o) => ({
                    id: o.id,
                    name: o.name,
                    amount: o.amount ?? 0,
                  }))}
                  selectedId={
                    cart.shipping_methods?.[0]?.shipping_option_id ?? undefined
                  }
                />
              </div>
            </section>
          )}

          {hasShipping && (
            <section className="border border-[var(--color-line)]">
              <div className="border-b border-[var(--color-line)] bg-[var(--color-surface-alt)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
                3. Payment
              </div>
              <div className="p-4">
                <p className="text-sm text-[var(--color-ink-muted)]">
                  Pay securely via Razorpay - UPI, credit/debit cards and net
                  banking supported.
                </p>
                <div className="mt-4">
                  <PlaceOrderButton />
                </div>
              </div>
            </section>
          )}
        </div>

        <aside className="h-fit border border-[var(--color-line)]">
          <div className="border-b border-[var(--color-line)] bg-[var(--color-surface-alt)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
            Order Summary
          </div>
          <div className="divide-y divide-[var(--color-line)] text-sm">
            {cart.items.map((item) => (
              <div
                key={item.id}
                className="flex justify-between gap-3 px-4 py-3"
              >
                <div>
                  <div className="font-medium">{item.product_title}</div>
                  <div className="font-mono text-xs text-[var(--color-ink-muted)]">
                    {item.variant?.sku} × {item.quantity}
                  </div>
                </div>
                <span className="font-medium">{formatINR(item.total)}</span>
              </div>
            ))}
          </div>
          <div className="space-y-2 border-t border-[var(--color-line)] p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--color-ink-muted)]">
                Items (incl. GST)
              </span>
              <span>{formatINR(cart.item_total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-ink-muted)]">Shipping</span>
              <span>{formatINR(cart.shipping_total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-ink-muted)]">GST included</span>
              <span>{formatINR(cart.tax_total)}</span>
            </div>
            <div className="flex justify-between border-t border-[var(--color-line)] pt-2 text-base font-bold">
              <span>Total</span>
              <span>{formatINR(cart.total)}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
