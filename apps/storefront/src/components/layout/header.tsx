import Link from "next/link"
import { HeaderActions } from "./header-actions"

const NAV = [
  { href: "/products", label: "Products" },
  { href: "/categories/plcs", label: "PLCs" },
  { href: "/quick-order", label: "Quick Order" },
  { href: "/request-quote", label: "Request Quote" },
  { href: "/resources", label: "Resources" },
]

// Pure static chrome. Cart/account personalization lives in the client
// <HeaderActions /> (fetched after load) so every page that renders the Header
// can be statically pre-rendered for SEO.
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
        <HeaderActions />
      </div>
    </header>
  )
}
