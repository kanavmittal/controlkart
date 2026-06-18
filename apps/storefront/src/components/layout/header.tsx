import Link from "next/link"
import { Suspense } from "react"
import { retrieveCart } from "@/lib/data/cart"
import { getCustomer } from "@/lib/data/auth"

const NAV = [
  { href: "/products", label: "Products" },
  { href: "/categories/plcs", label: "PLCs" },
  { href: "/quick-order", label: "Quick Order" },
  { href: "/request-quote", label: "Request Quote" },
  { href: "/resources", label: "Resources" },
]

async function HeaderActions() {
  const [cart, customer] = await Promise.all([retrieveCart(), getCustomer()])
  const itemCount =
    cart?.items?.reduce((acc, item) => acc + item.quantity, 0) ?? 0

  return (
    <div className="flex items-center gap-6 text-sm">
      <Link href="/account" className="hover:text-[var(--color-accent)]">
        {customer ? customer.first_name || "Account" : "Sign In"}
      </Link>
      <Link href="/cart" className="hover:text-[var(--color-accent)]">
        Cart{itemCount > 0 ? ` (${itemCount})` : ""}
      </Link>
    </div>
  )
}

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-line)] bg-[var(--color-surface)]">
      <div className="border-b border-[var(--color-line)] bg-[var(--color-surface-alt)]">
        <div className="shell flex h-8 items-center justify-between text-xs text-[var(--color-ink-muted)]">
          <span>Authorized Selec Distributor · Pan-India Shipping</span>
          <span>GST Invoice on Every Order</span>
        </div>
      </div>
      <div className="shell flex h-16 items-center justify-between gap-8">
        <Link href="/" className="text-lg font-bold tracking-tight">
          ControlKart
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="hover:text-[var(--color-accent)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Suspense
          fallback={<div className="text-sm text-[var(--color-ink-faint)]">…</div>}
        >
          <HeaderActions />
        </Suspense>
      </div>
    </header>
  )
}
