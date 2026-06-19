"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useCustomer } from "@/lib/hooks/use-customer"
import { useOrder } from "@/lib/hooks/use-orders"
import { formatINR, formatDate } from "@/lib/format"

const statusColors = {
  ok: "text-[var(--color-ok)] border-[var(--color-ok)]",
  warn: "text-[var(--color-warn)] border-[var(--color-warn)]",
  bad: "text-[var(--color-bad)] border-[var(--color-bad)]",
  muted: "text-[var(--color-ink-muted)] border-[var(--color-line)]",
}

function formatOrderStatus(status: string | undefined): string {
  if (!status) return "Unknown"
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function orderStatusTone(
  status: string | undefined
): "ok" | "warn" | "bad" | "muted" {
  switch (status) {
    case "completed":
    case "delivered":
      return "ok"
    case "canceled":
    case "cancelled":
      return "bad"
    case "pending":
    case "requires_action":
      return "warn"
    default:
      return "muted"
  }
}

function formatAddress(
  address: {
    first_name?: string | null
    last_name?: string | null
    company?: string | null
    address_1?: string | null
    address_2?: string | null
    city?: string | null
    province?: string | null
    postal_code?: string | null
    phone?: string | null
  } | null
) {
  if (!address) return null
  const lines = [
    [address.first_name, address.last_name].filter(Boolean).join(" "),
    address.company,
    address.address_1,
    address.address_2,
    [address.city, address.province, address.postal_code]
      .filter(Boolean)
      .join(", "),
    address.phone,
  ].filter(Boolean)
  return lines
}

export function OrderDetailView() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const router = useRouter()
  const { customer, isLoading: customerLoading } = useCustomer()
  const { order, isLoading: orderLoading } = useOrder(id)

  useEffect(() => {
    if (!customerLoading && !customer) {
      router.replace("/account?redirect=/account/orders/" + id)
    }
  }, [customer, customerLoading, router, id])

  if (customerLoading || !customer || orderLoading) {
    return (
      <div className="shell py-20 text-center text-sm text-[var(--color-ink-muted)]">
        Loading order…
      </div>
    )
  }

  if (!order) {
    return (
      <div className="shell py-20 text-center">
        <h1 className="text-2xl font-bold">Order not found</h1>
        <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
          We couldn’t find that order.
        </p>
        <div className="mt-6">
          <Link href="/account" className="btn-primary px-6 py-2.5">
            Back to Account
          </Link>
        </div>
      </div>
    )
  }

  const tone = orderStatusTone(order.status)
  const shippingAddress = formatAddress(order.shipping_address ?? null)
  const billingAddress = formatAddress(order.billing_address ?? null)
  const gstin = (order.metadata?.gstin as string) || null
  const shippingMethod = order.shipping_methods?.[0]

  return (
    <div className="shell py-12">
      <div className="mb-8">
        <Link
          href="/account"
          className="text-sm text-[var(--color-accent)] hover:underline"
        >
          ← Back to Account
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Order #{order.display_id}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            Placed on {formatDate(order.created_at as string)}
          </p>
        </div>
        <span
          className={`border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusColors[tone]}`}
        >
          {formatOrderStatus(order.status)}
        </span>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          {/* Line items */}
          <section className="border border-[var(--color-line)]">
            <div className="border-b border-[var(--color-line)] bg-[var(--color-surface-alt)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
              Items
            </div>
            <div className="divide-y divide-[var(--color-line)]">
              {order.items?.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[1fr_auto_auto] items-start gap-4 px-4 py-4 sm:grid-cols-[1fr_auto_auto_auto]"
                >
                  <div>
                    <div className="font-mono text-xs text-[var(--color-ink-muted)]">
                      {item.variant?.sku}
                    </div>
                    <div className="text-sm font-semibold">{item.title}</div>
                    {item.variant_title && item.variant_title !== "Default" && (
                      <div className="text-xs text-[var(--color-ink-muted)]">
                        {item.variant_title}
                      </div>
                    )}
                  </div>
                  <div className="text-right text-sm text-[var(--color-ink-muted)]">
                    Qty {item.quantity}
                  </div>
                  <div className="hidden text-right text-sm text-[var(--color-ink-muted)] sm:block">
                    {formatINR(item.unit_price)} ea
                  </div>
                  <div className="text-right text-sm font-semibold">
                    {formatINR(item.total)}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Fulfillment */}
          {order.fulfillments && order.fulfillments.length > 0 && (
            <section className="border border-[var(--color-line)]">
              <div className="border-b border-[var(--color-line)] bg-[var(--color-surface-alt)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
                Shipment
              </div>
              <div className="space-y-3 p-4 text-sm">
                {order.fulfillments.map((f) => {
                  const tracking =
                    (f.metadata?.tracking_number as string) ||
                    (f.data?.tracking_number as string)
                  const status = f.delivered_at
                    ? "delivered"
                    : f.shipped_at
                      ? "shipped"
                      : f.canceled_at
                        ? "canceled"
                        : "processing"
                  return (
                    <div key={f.id}>
                      <div className="font-medium">
                        {formatOrderStatus(status)}
                      </div>
                      {tracking && (
                        <div className="mt-1 font-mono text-xs text-[var(--color-ink-muted)]">
                          Tracking: {tracking}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          {/* Summary */}
          <section className="border border-[var(--color-line)]">
            <div className="border-b border-[var(--color-line)] bg-[var(--color-surface-alt)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
              Order Summary
            </div>
            <div className="space-y-2 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--color-ink-muted)]">
                  Subtotal (incl. GST)
                </span>
                <span>{formatINR(order.item_total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-ink-muted)]">Shipping</span>
                <span>{formatINR(order.shipping_total)}</span>
              </div>
              {shippingMethod && (
                <div className="text-xs text-[var(--color-ink-faint)]">
                  {shippingMethod.name}
                </div>
              )}
              <div className="flex justify-between border-t border-[var(--color-line)] pt-2 font-bold">
                <span>Total</span>
                <span>{formatINR(order.total)}</span>
              </div>
            </div>
          </section>

          {/* Delivery address */}
          {shippingAddress && (
            <section className="border border-[var(--color-line)]">
              <div className="border-b border-[var(--color-line)] bg-[var(--color-surface-alt)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
                Delivery Address
              </div>
              <div className="space-y-0.5 p-4 text-sm">
                {shippingAddress.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            </section>
          )}

          {/* Billing */}
          {(billingAddress || gstin) && (
            <section className="border border-[var(--color-line)]">
              <div className="border-b border-[var(--color-line)] bg-[var(--color-surface-alt)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
                Billing
              </div>
              <div className="space-y-0.5 p-4 text-sm">
                {gstin && (
                  <div className="mb-2 font-mono text-xs">
                    GSTIN: {gstin}
                  </div>
                )}
                {billingAddress?.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            </section>
          )}

          <Link
            href={`/account/orders/${order.id}/invoice`}
            className="btn-secondary block w-full px-4 py-2.5 text-center text-sm"
          >
            View GST Invoice
          </Link>
        </aside>
      </div>
    </div>
  )
}
