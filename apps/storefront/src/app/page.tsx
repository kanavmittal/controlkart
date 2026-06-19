import Link from "next/link"
import { HomeCategories } from "@/components/home/home-categories"
import { HomeFeaturedProducts } from "@/components/home/home-featured-products"
import { HomeResources } from "@/components/home/home-resources"

// Static shell (SSG): the hero/trust/shortcuts (above the fold) have no backend
// dependency. Categories / featured products / posts render client-side (CSR)
// below the fold — per Medusa's production rendering guide.

const TRUST_ITEMS = [
  { title: "Authorized Distribution", body: "Genuine Selec products sourced directly, with full manufacturer warranty." },
  { title: "Stock Transparency", body: "Live inventory on every product. What you see is what ships." },
  { title: "GST Invoicing", body: "GST-compliant invoice with every order. Add your GSTIN at checkout." },
  { title: "Pan-India Dispatch", body: "24-48 hr dispatch from our Mumbai warehouse to any pincode in India." },
]

const SHORTCUTS = [
  { href: "/quick-order", title: "Quick Order", body: "Enter SKUs and quantities directly. Built for repeat procurement." },
  { href: "/request-quote", title: "Request a Quote", body: "Bulk requirement? Get trade pricing within one working day." },
  { href: "/categories/plcs", title: "Browse PLCs", body: "Modular PLCs with flexible IO, Modbus RTU and Ethernet options." },
]

export default function HomePage() {
  return (
    <div>
      {/* Hero (SSG, above the fold) */}
      <section className="border-b border-[var(--color-line)]">
        <div className="shell grid gap-12 py-20 md:grid-cols-2 md:py-28">
          <div>
            <p className="text-sm font-medium text-[var(--color-accent)]">
              Authorized Selec Controls Distributor
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight md:text-5xl">
              Industrial automation components, stocked and shipped pan-India.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-[var(--color-ink-muted)]">
              Selec PLCs, IO modules and accessories with transparent stock,
              GST invoicing and dispatch within 48 hours. Built for OEMs,
              panel builders and maintenance teams.
            </p>
            <div className="mt-8 flex gap-3">
              <Link href="/categories/plcs" className="btn-primary px-6 py-2.5">
                Browse PLCs
              </Link>
              <Link href="/quick-order" className="btn-secondary px-6 py-2.5">
                Quick Order by SKU
              </Link>
            </div>
          </div>
          <div className="hidden border border-[var(--color-line)] md:grid md:grid-cols-2">
            {TRUST_ITEMS.map((item, i) => (
              <div
                key={item.title}
                className={`p-6 ${i % 2 === 0 ? "border-r" : ""} ${i < 2 ? "border-b" : ""} border-[var(--color-line)]`}
              >
                <h3 className="text-sm font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-muted)]">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Procurement shortcuts (SSG) */}
      <section className="border-b border-[var(--color-line)] bg-[var(--color-surface-alt)]">
        <div className="shell grid gap-px py-0 md:grid-cols-3">
          {SHORTCUTS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="group border-[var(--color-line)] p-8 md:border-r md:last:border-r-0"
            >
              <h3 className="text-base font-semibold group-hover:text-[var(--color-accent)]">
                {s.title} →
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-muted)]">
                {s.body}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Categories (CSR grid; static heading) */}
      <section className="shell py-20">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-bold tracking-tight">
            Product Categories
          </h2>
          <Link
            href="/products"
            className="text-sm font-medium text-[var(--color-accent)] hover:underline"
          >
            View all products →
          </Link>
        </div>
        <HomeCategories />
      </section>

      {/* Featured products (CSR grid; static heading) */}
      <section className="shell pb-20">
        <h2 className="text-2xl font-bold tracking-tight">Featured Products</h2>
        <HomeFeaturedProducts />
      </section>

      {/* Resources (CSR; renders its own section, hidden when empty) */}
      <HomeResources />
    </div>
  )
}
