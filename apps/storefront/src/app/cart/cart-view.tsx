"use client"

import Link from "next/link"
import { formatINR } from "@/lib/format"
import { useCart } from "@/lib/hooks/use-cart"
import { CartLineControls } from "./cart-line-controls"

/** Client-side cart (CSR). Reads the cart from the browser SDK via useCart(). */
export function CartView() {
  const { cart, isLoading } = useCart()
  const items = cart?.items ?? []

  if (isLoading) {
    return (
      <div className="shell py-20 text-center text-sm text-[var(--color-ink-muted)]">
        Loading your cart…
      </div>
    )
  }

  if (!items.length) {
    return (
      <div className="shell py-20 text-center">
        <h1 className="text-2xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
          Browse the catalog or use Quick Order to add items by SKU.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/products" className="btn-primary px-6 py-2.5">
            Browse Products
          </Link>
          <Link href="/quick-order" className="btn-secondary px-6 py-2.5">
            Quick Order
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="shell py-12">
      <h1 className="text-3xl font-bold tracking-tight">Cart</h1>
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
        <div className="border border-[var(--color-line)]">
          <div className="grid grid-cols-[1fr_auto_auto] gap-4 border-b border-[var(--color-line)] bg-[var(--color-surface-alt)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
            <span>Item</span>
            <span>Qty</span>
            <span className="text-right">Total</span>
          </div>
          {items.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-[var(--color-line)] px-4 py-4 last:border-b-0"
            >
              <div>
                <div className="font-mono text-xs text-[var(--color-ink-muted)]">
                  {item.variant?.sku}
                </div>
                <Link
                  href={`/products/${item.variant?.product?.handle ?? ""}`}
                  className="text-sm font-semibold hover:text-[var(--color-accent)]"
                >
                  {item.product_title}
                </Link>
                <div className="text-xs text-[var(--color-ink-muted)]">
                  {item.variant_title}
                </div>
              </div>
              <CartLineControls lineId={item.id} quantity={item.quantity} />
              <div className="text-right text-sm font-semibold">
                {formatINR(item.total)}
              </div>
            </div>
          ))}
        </div>

        <aside className="h-fit border border-[var(--color-line)]">
          <div className="border-b border-[var(--color-line)] bg-[var(--color-surface-alt)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
            Order Summary
          </div>
          <div className="space-y-2 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--color-ink-muted)]">
                Subtotal (incl. GST)
              </span>
              <span>{formatINR(cart?.item_total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-ink-muted)]">GST included</span>
              <span>{formatINR(cart?.item_tax_total)}</span>
            </div>
            <div className="flex justify-between border-t border-[var(--color-line)] pt-2 text-base font-bold">
              <span>Total</span>
              <span>{formatINR(cart?.total)}</span>
            </div>
            <p className="text-xs text-[var(--color-ink-faint)]">
              Shipping calculated at checkout.
            </p>
          </div>
          <div className="p-4 pt-0">
            <Link
              href="/checkout"
              className="btn-primary block w-full px-4 py-2.5 text-center"
            >
              Proceed to Checkout
            </Link>
          </div>
        </aside>
      </div>
    </div>
  )
}
