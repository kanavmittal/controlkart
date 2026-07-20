"use client"

import Image from "next/image"
import Link from "next/link"
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react"
import type { HttpTypes } from "@medusajs/types"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button, buttonVariants } from "@/components/ui/button"
import { PriceBreakdown } from "@/components/shared/price-breakdown"
import { formatINR } from "@/lib/format"
import { useCart } from "@/lib/hooks/use-cart"
import { cn } from "@/lib/utils"
import { useCartDrawer } from "./cart-drawer-context"

/**
 * Right-side cart drawer (shadcn `Sheet`), open state owned by
 * `useCartDrawer()` (`cart-drawer-context.tsx`). Cart data + mutations come
 * from `useCart()` exactly as `app/cart/cart-view.tsx` +
 * `cart-line-controls.tsx` use it — same optimistic `updateItem` (quantity
 * <= 0 deletes the line), no separate mutation logic lives here.
 *
 * Not mounted anywhere yet — T14 mounts `CartDrawerProvider` + `CartDrawer`
 * in the layout once the new chrome replaces the old.
 */
export function CartDrawer() {
  const { open, openDrawer, closeDrawer } = useCartDrawer()
  const { cart, isLoading, updateItem } = useCart()
  const items = cart?.items ?? []

  return (
    <Sheet open={open} onOpenChange={(next) => (next ? openDrawer() : closeDrawer())}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-[var(--color-athens-line)] p-4">
          <SheetTitle>Cart</SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center px-6 text-sm text-[var(--color-athens-body)]">
            Loading your cart…
          </div>
        ) : items.length === 0 ? (
          <EmptyState onNavigate={closeDrawer} />
        ) : (
          <>
            <div className="flex-1 divide-y divide-[var(--color-athens-line)] overflow-y-auto">
              {items.map((item) => (
                <CartDrawerLine
                  key={item.id}
                  item={item}
                  pending={updateItem.isPending}
                  onQuantityChange={(quantity) =>
                    updateItem.mutate({ lineId: item.id, quantity })
                  }
                />
              ))}
            </div>

            <div className="border-t border-[var(--color-athens-line)] p-4">
              <PriceBreakdown
                compact
                itemSubtotal={cart?.item_subtotal}
                originalItemTotal={cart?.original_item_total}
                discountTotal={cart?.discount_total}
                taxTotal={cart?.tax_total}
                total={cart?.total}
                shippingNote="Calculated at checkout"
              />

              <div className="mt-4 flex flex-col gap-2">
                <Link
                  href="/cart"
                  onClick={closeDrawer}
                  className={cn(buttonVariants({ variant: "outline" }), "w-full")}
                >
                  View cart
                </Link>
                <Link
                  href="/checkout"
                  onClick={closeDrawer}
                  className={cn(buttonVariants({ variant: "secondary" }), "w-full")}
                >
                  Checkout
                </Link>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function EmptyState({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <ShoppingCart className="size-10 text-[var(--color-athens-body)]" aria-hidden />
      <div>
        <p className="text-base font-medium text-[var(--color-athens-dark)]">
          Your cart is empty
        </p>
        <p className="mt-1 text-sm text-[var(--color-athens-body)]">
          Browse the catalog to find what you need.
        </p>
      </div>
      <Link
        href="/products"
        onClick={onNavigate}
        className={cn(buttonVariants({ variant: "default" }), "mt-2")}
      >
        Browse products
      </Link>
    </div>
  )
}

function CartDrawerLine({
  item,
  pending,
  onQuantityChange,
}: {
  item: HttpTypes.StoreCartLineItem
  pending: boolean
  onQuantityChange: (quantity: number) => void
}) {
  const quantity = item.quantity ?? 0

  return (
    <div className="flex gap-3 p-4">
      <div className="relative size-20 shrink-0 overflow-hidden rounded-[var(--radius)] border border-[var(--color-athens-line)] bg-[var(--color-athens-band)]">
        {item.thumbnail ? (
          <Image
            src={item.thumbnail}
            alt={item.product_title ?? item.title}
            fill
            className="object-contain p-2"
            sizes="80px"
          />
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[var(--color-athens-dark)]">
              {item.product_title ?? item.title}
            </p>
            {item.variant_title ? (
              <p className="truncate text-xs text-[var(--color-athens-body)]">
                {item.variant_title}
              </p>
            ) : null}
          </div>
          <span className="shrink-0 text-sm font-medium text-[var(--color-athens-dark)]">
            {formatINR(item.unit_price)}
          </span>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <div className="flex items-center border border-[var(--color-athens-line)]">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="rounded-none border-0"
              disabled={pending}
              aria-label="Decrease quantity"
              onClick={() => onQuantityChange(quantity - 1)}
            >
              <Minus />
            </Button>
            <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">
              {quantity}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="rounded-none border-0"
              disabled={pending}
              aria-label="Increase quantity"
              onClick={() => onQuantityChange(quantity + 1)}
            >
              <Plus />
            </Button>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="border-0"
            disabled={pending}
            aria-label="Remove item"
            onClick={() => onQuantityChange(0)}
          >
            <Trash2 />
          </Button>
        </div>
      </div>
    </div>
  )
}
