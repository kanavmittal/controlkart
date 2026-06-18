import type { Metadata } from "next"
import { listProducts } from "@/lib/data/products"
import { ProductCard } from "@/components/products/product-card"

export const metadata: Metadata = {
  title: "All Products - Selec Industrial Automation Components",
  description:
    "Browse Selec PLCs, IO modules, displays and industrial automation accessories. Live stock, GST-inclusive pricing, pan-India shipping.",
  alternates: { canonical: "/products" },
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const { products, count } = await listProducts({ q, limit: 48 })

  return (
    <div className="shell py-12">
      <header className="border-b border-[var(--color-line)] pb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          {q ? `Search: "${q}"` : "All Products"}
        </h1>
        <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
          {count} product{count === 1 ? "" : "s"} · Prices inclusive of GST
        </p>
        <form action="/products" className="mt-4 flex max-w-md gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search by name, SKU or model…"
            className="flex-1 border border-[var(--color-line)] px-3 py-2 text-sm outline-none focus:border-[var(--color-line-strong)]"
          />
          <button type="submit" className="btn-primary px-4 py-2">
            Search
          </button>
        </form>
      </header>
      <div className="mt-8 grid grid-cols-1 gap-px border border-[var(--color-line)] bg-[var(--color-line)] sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      {!products.length && (
        <p className="mt-8 text-sm text-[var(--color-ink-muted)]">
          No products matched your search.
        </p>
      )}
    </div>
  )
}
