"use client"

import Image from "next/image"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useEffect, useRef } from "react"
import {
  BadgeCheck,
  CheckCircle2,
  FileText,
  LogOut,
  MapPin,
  Package,
  Zap,
} from "lucide-react"

import { useCustomer, useAuthMutations } from "@/lib/hooks/use-customer"
import { useOrders } from "@/lib/hooks/use-orders"
import { isEmailVerified } from "@/lib/customer"
import { safeRedirect } from "@/lib/redirect"
import { formatINR, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Breadcrumbs } from "@/components/shared/breadcrumbs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AuthForms } from "./auth-forms"
import { VerificationBanner } from "./verification-banner"

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

/** Client-side account dashboard (CSR). Reads the signed-in customer + orders. */
export function AccountView() {
  const { customer, isLoading } = useCustomer()
  const searchParams = useSearchParams()
  const redirectTo = safeRedirect(searchParams.get("redirect"))
  const error = searchParams.get("error") ?? undefined
  const verify = searchParams.get("verify") ?? undefined
  const cardColRef = useRef<HTMLDivElement>(null)

  // "Tall sidebar" sticky behavior for the auth card column (desktop only):
  // the column is position:sticky and its `top` is set from its measured
  // height — shorter than the viewport → pinned centered; taller → pinned by
  // its bottom edge just above the viewport bottom, so no part of the form is
  // ever clipped out of reach while scrolling (unlike a naive
  // top-1/2 + -translate-y-1/2 centering, which cuts the top off tall cards).
  useEffect(() => {
    const col = cardColRef.current
    if (!col) return
    const mq = window.matchMedia("(min-width: 1024px)")
    const apply = () => {
      if (!mq.matches) {
        col.style.removeProperty("top")
        return
      }
      const h = col.offsetHeight
      const vh = window.innerHeight
      col.style.top =
        h <= vh - 48 ? `${Math.round((vh - h) / 2)}px` : `${vh - h - 24}px`
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(col)
    window.addEventListener("resize", apply)
    return () => {
      ro.disconnect()
      window.removeEventListener("resize", apply)
    }
  }, [customer, isLoading])

  if (isLoading) {
    return (
      <div className="athens-container py-20 text-center text-sm text-athens-body">
        Loading your account…
      </div>
    )
  }

  if (!customer) {
    return (
      <>
        <Breadcrumbs crumbs={[{ label: "Account" }]} />
        <div className="bg-athens-band">
          <div className="athens-container grid items-start gap-10 py-10 md:py-14 lg:min-h-[calc(100vh+24rem)] lg:max-w-6xl lg:grid-cols-[1.05fr_1fr] lg:gap-14">
            {/* Brand panel (desktop only) */}
            <div className="relative hidden min-h-[560px] overflow-hidden rounded-2xl lg:sticky lg:top-10 lg:block">
              <Image
                src="/marketing/home/athens_toolset.jpg"
                alt="Professional tools from ControlKart"
                fill
                priority
                className="object-cover"
                sizes="(min-width: 1024px) 50vw, 100vw"
              />
              <div
                className="absolute inset-0 bg-gradient-to-t from-athens-dark/90 via-athens-dark/40 to-athens-dark/10"
                aria-hidden
              />
              <div className="absolute inset-x-0 bottom-0 p-8">
                <p className="text-2xl font-semibold tracking-tight text-white">
                  ControlKart
                </p>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/80">
                  Industrial tools, PLCs and drives — genuine stock at trade
                  prices, dispatched fast across India.
                </p>
                <ul className="mt-5 space-y-2">
                  {[
                    "GST invoicing on every order",
                    "Same-day dispatch on stocked items",
                    "Dedicated support for trade accounts",
                  ].map((point) => (
                    <li
                      key={point}
                      className="flex items-center gap-2 text-sm text-white/85"
                    >
                      <CheckCircle2
                        className="size-4 shrink-0 text-white"
                        aria-hidden
                      />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Auth card */}
            <div
              ref={cardColRef}
              className="mx-auto w-full max-w-md lg:sticky lg:mx-0 lg:justify-self-end"
            >
              <h1 className="athens-page-title">Welcome to ControlKart</h1>
              <p className="mt-2 text-sm text-athens-body">
                An account is required to purchase. Sign in or create an
                account in under a minute.
              </p>
              <div className="mt-8">
                <AuthForms redirectTo={redirectTo} errorMessage={error} />
              </div>
            </div>
          </div>
        </div>
      </>
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
    <>
      <Breadcrumbs crumbs={[{ label: "Account" }]} />
      <div className="athens-container py-10 md:py-12">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="athens-page-title">
                {customer.first_name
                  ? `Hello, ${customer.first_name}`
                  : "My Account"}
              </h1>
              {verified && (
                <Badge className="border-transparent bg-athens-success-bg text-athens-success">
                  <BadgeCheck aria-hidden />
                  Verified
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-athens-body">{customer.email}</p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              logout.mutate()
            }}
          >
            <Button type="submit" variant="outline" size="sm">
              <LogOut aria-hidden />
              Sign out
            </Button>
          </form>
        </div>

        {!verified && <VerificationBanner />}

        {verify === "sent" && !verified && (
          <Alert className="mt-6 border-athens-success/40 bg-athens-success-bg">
            <CheckCircle2 className="text-athens-success" aria-hidden />
            <AlertTitle className="text-athens-success">
              Account created
            </AlertTitle>
            <AlertDescription className="text-athens-body">
              Check your email for a verification link.
            </AlertDescription>
          </Alert>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <QuickLinkCard
            href="/account/addresses"
            icon={MapPin}
            title="Addresses"
            description="Manage delivery & billing addresses"
          />
          <QuickLinkCard
            href="/quick-order"
            icon={Zap}
            title="Quick Order"
            description="Add items to cart by SKU"
          />
          <QuickLinkCard
            href="/request-quote"
            icon={FileText}
            title="Request Quote"
            description="Get pricing for bulk or custom orders"
          />
        </div>

        <section className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="athens-section-heading text-xl">Order History</h2>
          </div>

          {orders.length ? (
            <Card className="mt-4 rounded-[var(--radius)] border-athens-line py-0">
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-athens-line hover:bg-transparent">
                      <TableHead>Order #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow
                        key={order.id}
                        className="border-athens-line"
                      >
                        <TableCell className="font-mono text-xs">
                          #{order.display_id}
                        </TableCell>
                        <TableCell className="text-athens-body">
                          {formatDate(order.created_at as string)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={cn(
                              STATUS_TONE_CLASS[orderStatusTone(order.status)]
                            )}
                          >
                            {formatOrderStatus(order.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium text-athens-dark">
                          {formatINR(order.total)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-3">
                            <Link
                              href={`/account/orders/${order.id}`}
                              className="text-sm text-athens-blue hover:underline"
                            >
                              View
                            </Link>
                            <Link
                              href={`/account/orders/${order.id}/invoice`}
                              className="text-sm text-athens-blue hover:underline"
                            >
                              Invoice
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Empty className="mt-4 border border-dashed border-athens-line">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Package aria-hidden />
                </EmptyMedia>
                <EmptyTitle>No orders yet</EmptyTitle>
                <EmptyDescription>
                  Your past orders will show up here once you place one.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button render={<Link href="/products" />}>
                  Browse products
                </Button>
              </EmptyContent>
            </Empty>
          )}
        </section>
      </div>
    </>
  )
}

function QuickLinkCard({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <Link href={href} className="group block">
      <Card className="h-full border-athens-line transition-colors group-hover:border-athens-blue">
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius)] bg-athens-band text-athens-blue">
            <Icon className="size-5" />
          </span>
          <div>
            <CardTitle className="text-sm">{title}</CardTitle>
            <p className="mt-0.5 text-xs text-athens-body">{description}</p>
          </div>
        </CardHeader>
      </Card>
    </Link>
  )
}
