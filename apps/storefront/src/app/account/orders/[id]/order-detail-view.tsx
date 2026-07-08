"use client"

import { useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, FileText } from "lucide-react"

import { useCustomer } from "@/lib/hooks/use-customer"
import { useOrder } from "@/lib/hooks/use-orders"
import { formatINR, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Breadcrumbs } from "@/components/shared/breadcrumbs"
import { Price } from "@/components/shared/price"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// Status badge tones — same mapping + tone classes as the orders table in
// `app/account/account-view.tsx` (T36) so list and detail badges match.
type OrderStatusTone = "success" | "warning" | "destructive" | "muted"

const STATUS_TONE_CLASS: Record<OrderStatusTone, string> = {
  success: "border-transparent bg-athens-success-bg text-athens-success",
  warning: "border-transparent bg-athens-warning-bg text-athens-warning",
  destructive: "border-transparent bg-destructive/10 text-destructive",
  muted: "border-athens-line bg-transparent text-athens-body",
}

function orderStatusTone(status: string | undefined): OrderStatusTone {
  switch (status) {
    case "completed":
    case "delivered":
      return "success"
    case "canceled":
    case "cancelled":
      return "destructive"
    case "pending":
    case "requires_action":
      return "warning"
    default:
      return "muted"
  }
}

function formatOrderStatus(status: string | undefined): string {
  if (!status) return "Unknown"
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
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

/** Client-side order detail (CSR). Reads the signed-in customer + one order. */
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
      <div className="athens-container py-20 text-center text-sm text-athens-body">
        Loading order…
      </div>
    )
  }

  if (!order) {
    return (
      <>
        <Breadcrumbs
          crumbs={[{ label: "Account", href: "/account" }, { label: "Order" }]}
        />
        <div className="athens-container py-20 text-center">
          <h1 className="athens-section-heading text-[32px]">
            Order not found
          </h1>
          <p className="mt-2 text-sm text-athens-body">
            We couldn’t find that order.
          </p>
          <div className="mt-6 flex justify-center">
            <Button render={<Link href="/account" />}>Back to Account</Button>
          </div>
        </div>
      </>
    )
  }

  const shippingAddress = formatAddress(order.shipping_address ?? null)
  const billingAddress = formatAddress(order.billing_address ?? null)
  const gstin = (order.metadata?.gstin as string) || null
  const shippingMethod = order.shipping_methods?.[0]

  return (
    <>
      <Breadcrumbs
        crumbs={[
          { label: "Account", href: "/account" },
          { label: `Order #${order.display_id}` },
        ]}
      />
      <div className="athens-container py-10 md:py-12">
        {/* Header row */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="athens-section-heading text-[32px]">
                Order #{order.display_id}
              </h1>
              <Badge
                className={cn(STATUS_TONE_CLASS[orderStatusTone(order.status)])}
              >
                {formatOrderStatus(order.status)}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-athens-body">
              Placed on {formatDate(order.created_at as string)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              render={<Link href={`/account/orders/${order.id}/invoice`} />}
            >
              <FileText aria-hidden />
              View GST Invoice
            </Button>
            <Button
              variant="ghost"
              size="sm"
              render={<Link href="/account" />}
            >
              <ArrowLeft aria-hidden />
              Back to Account
            </Button>
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            {/* Line items */}
            <Card className="rounded-[var(--radius)] border-athens-line py-0">
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-athens-line hover:bg-transparent">
                      <TableHead className="w-16" />
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="hidden text-right sm:table-cell">
                        Unit price
                      </TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.items?.map((item) => (
                      <TableRow key={item.id} className="border-athens-line">
                        <TableCell>
                          <div className="relative size-12 overflow-hidden rounded-[var(--radius)] border border-athens-line bg-athens-band">
                            {item.thumbnail ? (
                              <Image
                                src={item.thumbnail}
                                alt={item.title}
                                fill
                                className="object-contain p-1"
                                sizes="48px"
                              />
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-normal">
                          {item.variant?.sku ? (
                            <div className="font-mono text-xs text-athens-body">
                              {item.variant.sku}
                            </div>
                          ) : null}
                          <div className="text-sm font-medium text-athens-dark">
                            {item.title}
                          </div>
                          {item.variant_title &&
                            item.variant_title !== "Default" && (
                              <div className="text-xs text-athens-body">
                                {item.variant_title}
                              </div>
                            )}
                        </TableCell>
                        <TableCell className="text-right text-athens-body">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="hidden text-right text-athens-body sm:table-cell">
                          {formatINR(item.unit_price)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-athens-dark">
                          {formatINR(item.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Fulfillment / tracking */}
            {order.fulfillments && order.fulfillments.length > 0 && (
              <Card size="sm" className="border-athens-line">
                <CardHeader>
                  <CardTitle>Shipment</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
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
                        <Badge
                          className={cn(
                            STATUS_TONE_CLASS[orderStatusTone(status)]
                          )}
                        >
                          {formatOrderStatus(status)}
                        </Badge>
                        {tracking && (
                          <div className="mt-2 text-xs text-athens-body">
                            Tracking:{" "}
                            <span className="font-mono text-athens-dark">
                              {tracking}
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )}

            {/* Delivery + billing addresses */}
            <div className="grid gap-6 sm:grid-cols-2">
              {shippingAddress && (
                <Card size="sm" className="border-athens-line">
                  <CardHeader>
                    <CardTitle>Delivery Address</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-0.5 text-sm text-athens-body">
                    {shippingAddress.map((line, i) => (
                      <div key={i}>{line}</div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {(billingAddress || gstin) && (
                <Card size="sm" className="border-athens-line">
                  <CardHeader>
                    <CardTitle>Billing</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-0.5 text-sm text-athens-body">
                    {gstin && (
                      <div className="mb-2 font-mono text-xs text-athens-dark">
                        GSTIN: {gstin}
                      </div>
                    )}
                    {billingAddress?.map((line, i) => (
                      <div key={i}>{line}</div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Summary */}
          <aside>
            <Card size="sm" className="h-fit border-athens-line">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-athens-body">Subtotal (incl. GST)</span>
                  <Price
                    amount={order.item_total}
                    className="text-sm leading-none font-normal text-athens-dark"
                  />
                </div>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-athens-body">Shipping</span>
                  <Price
                    amount={order.shipping_total}
                    className="text-sm leading-none font-normal text-athens-dark"
                  />
                </div>
                {shippingMethod && (
                  <div className="text-xs text-athens-body">
                    {shippingMethod.name}
                  </div>
                )}
                <div className="flex items-baseline justify-between border-t border-athens-line pt-3 text-base font-semibold">
                  <span className="text-athens-dark">Total</span>
                  <Price
                    amount={order.total}
                    className="text-base leading-none font-semibold text-athens-dark"
                  />
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </>
  )
}
