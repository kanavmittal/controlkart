"use client"

import Link from "next/link"
import { ShoppingCart, User } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { useCartDrawer } from "@/components/cart/cart-drawer-context"
import { useCart } from "@/lib/hooks/use-cart"
import { useCustomer } from "@/lib/hooks/use-customer"

/**
 * T11 — live account + cart actions for the NEW header mast. Replaces
 * `layout/header-actions.tsx` (old chrome; that file is untouched here and
 * deleted by T14 once the old header is retired). Rendered only by the new
 * `site-header.tsx`, in its marked "T11 slot" — T14 wires it in; this file
 * currently has no importer.
 *
 * Icon sizing/spacing (`h-[26px] w-[26px]`, `text-athens-dark`) matches the
 * placeholder icons already in `site-header.tsx`'s T11 slot and the clone's
 * `SiteHeader.tsx` mast (`UserIcon`/`ShoppingCartIcon` at 26px).
 */
export function HeaderLiveActions() {
  const { customer, isLoading } = useCustomer()
  const { itemCount } = useCart()
  const { openDrawer } = useCartDrawer()

  const accountLabel = customer ? customer.first_name || "Account" : "Sign in"

  return (
    <div className="flex shrink-0 items-center gap-4">
      <Link
        href="/account"
        aria-label={isLoading ? "Account" : accountLabel}
        className="flex items-center gap-1.5 text-athens-dark"
      >
        <User className="h-[26px] w-[26px]" aria-hidden="true" />
        {/* Loading: icon only, no label — avoids a "Sign in" → name flicker
            once useCustomer() resolves. */}
        {!isLoading && (
          <span className="hidden max-w-[90px] truncate text-[14px] font-medium min-[1200px]:inline">
            {accountLabel}
          </span>
        )}
      </Link>

      {/*
        Cart trigger. `useCartDrawer()` (cart-drawer-context.tsx) always
        returns a callable `openDrawer` — a real one when a
        `CartDrawerProvider` is mounted, or a safe no-op fallback when it
        isn't (pre-T14, or any caller rendered outside the provider). The
        context module exports only `CartDrawerProvider`/`useCartDrawer`; its
        no-op object isn't exported, so this component has no way to detect
        which variant it got. Per plan, the simplest correct behavior given
        that constraint: keep this as a real `<Link href="/cart">` (so it's a
        fully working, JS-free navigation target), then intercept the click
        to open the drawer instead. This means the icon is inert (does
        nothing — not even nav) until a provider is mounted, because
        `preventDefault()` fires unconditionally. That's acceptable: this
        component is only rendered by the NEW `site-header.tsx`, which T14
        mounts together with `CartDrawerProvider` in the same layout change —
        old chrome keeps using `header-actions.tsx` (real `/cart` link, no
        interception) until then.
      */}
      <Link
        href="/cart"
        onClick={(e) => {
          e.preventDefault()
          openDrawer()
        }}
        aria-label="Cart"
        className="relative flex items-center text-athens-dark"
      >
        <ShoppingCart className="h-[26px] w-[26px]" aria-hidden="true" />
        {itemCount > 0 && (
          <Badge
            aria-hidden="true"
            className="absolute -top-1.5 -right-1.5 h-[18px] min-w-[18px] justify-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground"
          >
            {itemCount > 99 ? "99+" : itemCount}
          </Badge>
        )}
        {/* The count itself lives in an aria-live region (visually hidden)
            so screen readers announce cart changes without duplicating the
            visible badge's number. */}
        <span className="sr-only" aria-live="polite">
          {itemCount} {itemCount === 1 ? "item" : "items"} in cart
        </span>
      </Link>
    </div>
  )
}
