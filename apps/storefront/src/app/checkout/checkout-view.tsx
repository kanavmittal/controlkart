"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useCart } from "@/lib/hooks/use-cart"
import { useCustomer } from "@/lib/hooks/use-customer"
import { useAddresses } from "@/lib/hooks/use-addresses"
import { useCartId } from "@/components/providers/cart-provider"
import { isEmailVerified } from "@/lib/customer"
import { formatINR } from "@/lib/format"
import { ShippingSelector, PlaceOrderButton } from "./checkout-controls"
import { CheckoutAddressForm } from "./checkout-address-form"

export function CheckoutView() {
  const router = useRouter()
  const { hydrated, cartId } = useCartId()
  const { cart, isLoading: cartLoading } = useCart()
  const { customer, isLoading: custLoading } = useCustomer()
  const { addresses } = useAddresses()

  const ready = hydrated && !cartLoading && !custLoading
  const cartEmpty = !cart || !cart.items?.length
  const verified = isEmailVerified(customer)

  useEffect(() => {
    if (!ready) return
    if (!cartId || cartEmpty) {
      router.replace("/cart")
      return
    }
    if (!customer || !verified) {
      router.replace("/account?redirect=/checkout")
    }
  }, [ready, cartId, cartEmpty, customer, verified, router])

  if (!ready || !cartId || cartEmpty || !customer || !verified || !cart) {
    return (
      <div className="shell py-20 text-center text-sm text-[var(--color-ink-muted)]">
        Loading checkout…
      </div>
    )
  }

  const hasAddress = !!cart.shipping_address?.postal_code
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
              savedAddresses={addresses}
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
                <ShippingSelector />
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
            {cart.items?.map((item) => (
              <div key={item.id} className="flex justify-between gap-3 px-4 py-3">
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
