"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ShoppingCart, X } from "lucide-react"
import { toast } from "sonner"

import { Breadcrumbs } from "@/components/shared/breadcrumbs"
import { Price } from "@/components/shared/price"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatINR } from "@/lib/format"
import { useCart } from "@/lib/hooks/use-cart"
import { cn } from "@/lib/utils"
import { CartLineControls } from "./cart-line-controls"

/**
 * Client-side cart (CSR). Reads the cart from the browser SDK via
 * `useCart()` — untouched from the pre-restyle version, this file only
 * changes presentation. Empty/loading states mirror `cart-drawer.tsx`'s
 * pattern; totals fields shown (subtotal incl. GST, GST, total) are the
 * same fields the pre-restyle page rendered.
 */
export function CartView() {
  const { cart, isLoading } = useCart()
  const items = cart?.items ?? []
  const discountTotal = cart?.discount_total ?? 0

  if (isLoading) {
    return (
      <div className="athens-container py-24 text-center text-sm text-athens-body">
        Loading your cart…
      </div>
    )
  }

  if (!items.length) {
    return (
      <>
        <Breadcrumbs crumbs={[{ label: "Cart" }]} />
        <div className="athens-container flex min-h-[50vh] flex-col items-center justify-center gap-4 py-20 text-center">
          <ShoppingCart className="size-10 text-athens-body" aria-hidden />
          <div>
            <h1 className="athens-page-title">Your cart is empty</h1>
            <p className="mt-2 text-sm text-athens-body">
              Browse the catalog or use Quick Order to add items by SKU.
            </p>
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <Link href="/products" className={cn(buttonVariants({ variant: "default" }))}>
              Browse products
            </Link>
            <Link
              href="/quick-order"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Quick order
            </Link>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Breadcrumbs crumbs={[{ label: "Cart" }]} />
      <div className="athens-container py-10">
        <h1 className="athens-page-title mb-6">Your cart</h1>

        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <div className="divide-y divide-athens-line border border-athens-line">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-4 p-4 sm:grid sm:grid-cols-[88px_1fr_auto_auto_auto] sm:items-center sm:gap-4"
              >
                <div className="relative size-24 shrink-0 overflow-hidden rounded-[var(--radius)] border border-athens-line bg-athens-band sm:size-[88px]">
                  {item.thumbnail ? (
                    <Image
                      src={item.thumbnail}
                      alt={item.product_title ?? item.title}
                      fill
                      className="object-contain p-2"
                      sizes="88px"
                    />
                  ) : null}
                </div>

                <div className="min-w-0">
                  <Link
                    href={`/products/${item.variant?.product?.handle ?? ""}`}
                    className="text-sm font-medium text-athens-dark hover:underline"
                  >
                    {item.product_title}
                  </Link>
                  {item.variant_title ? (
                    <p className="mt-0.5 truncate text-xs text-athens-body">
                      {item.variant_title}
                    </p>
                  ) : null}
                </div>

                <div className="flex items-center justify-between gap-3 sm:block sm:text-right">
                  <span className="text-xs text-athens-body sm:hidden">
                    Unit price
                  </span>
                  <Price
                    amount={item.unit_price}
                    className="text-sm font-normal sm:justify-end"
                  />
                </div>

                <CartLineControls lineId={item.id} quantity={item.quantity} />

                <div className="flex items-center justify-between gap-3 sm:block sm:text-right">
                  <span className="text-xs text-athens-body sm:hidden">
                    Line total
                  </span>
                  <Price
                    amount={item.total}
                    className="text-sm font-semibold sm:justify-end"
                  />
                </div>
              </div>
            ))}
          </div>

          <Card size="sm" className="h-fit">
            <CardHeader>
              <CardTitle>Order summary</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-athens-body">Subtotal (incl. GST)</span>
                <Price
                  amount={cart?.item_total}
                  className="text-sm leading-none font-normal text-athens-dark"
                />
              </div>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-athens-body">GST included</span>
                <Price
                  amount={cart?.item_tax_total}
                  className="text-sm leading-none font-normal text-athens-dark"
                />
              </div>
              {discountTotal > 0 ? (
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-athens-success">Discount</span>
                  <span className="text-sm leading-none font-normal text-athens-success">
                    −{formatINR(discountTotal)}
                  </span>
                </div>
              ) : null}
              <div className="flex items-baseline justify-between border-t border-athens-line pt-3 text-base font-semibold">
                <span className="text-athens-dark">Total</span>
                <Price
                  amount={cart?.total}
                  className="text-base leading-none font-semibold text-athens-dark"
                />
              </div>
              <p className="text-xs text-athens-body">
                Prices include GST. Shipping calculated at checkout.
              </p>

              <PromoCodeForm />

              <div className="mt-2 flex flex-col gap-2">
                <Link
                  href="/checkout"
                  className={cn(buttonVariants({ variant: "secondary" }), "w-full")}
                >
                  Proceed to checkout
                </Link>
                <Link
                  href="/products"
                  className={cn(buttonVariants({ variant: "outline" }), "w-full")}
                >
                  Continue shopping
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}

/** Promo/coupon code input + applied-codes list, wired to `useCart()`'s
 *  `applyPromoCode`/`removePromoCode` mutations (`sdk.store.cart.addPromotions`
 *  / `removePromotions`). Renders nothing extra when no codes are applied
 *  beyond the input row itself. */
function PromoCodeForm() {
  const { cart, applyPromoCode, removePromoCode } = useCart()
  const [code, setCode] = useState("")
  const appliedCodes = (cart?.promotions ?? [])
    .map((p) => p.code)
    .filter((c): c is string => !!c)

  const onApply = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = code.trim()
    if (!trimmed) return
    applyPromoCode.mutate(trimmed, {
      onSuccess: (c) => {
        const applied = (c.promotions ?? []).some(
          (p) => p.code?.toLowerCase() === trimmed.toLowerCase()
        )
        if (applied) {
          toast.success(`Applied code ${trimmed}`)
          setCode("")
        } else {
          toast.error("That code isn't valid for this cart.")
        }
      },
      onError: () => toast.error("Couldn't apply that code. Please try again."),
    })
  }

  return (
    <div className="border-t border-athens-line pt-3">
      <form onSubmit={onApply} className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Promo code"
          disabled={applyPromoCode.isPending}
          aria-label="Promo code"
          className="flex-1"
        />
        <Button
          type="submit"
          variant="outline"
          disabled={applyPromoCode.isPending || !code.trim()}
        >
          {applyPromoCode.isPending ? "Applying…" : "Apply"}
        </Button>
      </form>

      {appliedCodes.length > 0 ? (
        <ul className="mt-2 flex flex-col gap-1.5">
          {appliedCodes.map((c) => (
            <li
              key={c}
              className="flex items-center justify-between gap-2 rounded-[var(--radius)] bg-athens-band px-2.5 py-1.5 text-sm"
            >
              <span className="font-medium text-athens-dark">{c}</span>
              <button
                type="button"
                onClick={() => removePromoCode.mutate(c)}
                disabled={removePromoCode.isPending}
                aria-label={`Remove code ${c}`}
                className="text-athens-body transition-colors hover:text-athens-dark disabled:pointer-events-none disabled:opacity-40"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
