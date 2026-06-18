import type { Metadata } from "next"
import { listProducts } from "@/lib/data/products"
import { ProductsBrowser } from "./products-browser"

export const revalidate = 300

export const metadata: Metadata = {
  title: "All Products - Selec Industrial Automation Components",
  description:
    "Browse Selec PLCs, IO modules, displays and industrial automation accessories. Live stock, GST-inclusive pricing, pan-India shipping.",
  alternates: { canonical: "/products" },
}

export default async function ProductsPage() {
  // Static catalog (ISR) — search/filter happens client-side in ProductsBrowser.
  const { products } = await listProducts({ limit: 100 })

  return (
    <div className="shell py-12">
      <header className="border-b border-[var(--color-line)] pb-6">
        <h1 className="text-3xl font-bold tracking-tight">All Products</h1>
        <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
          Selec PLCs, HMIs, timers, meters and accessories — live stock,
          GST-inclusive pricing, pan-India shipping.
        </p>
      </header>
      <ProductsBrowser products={products} />
    </div>
  )
}
