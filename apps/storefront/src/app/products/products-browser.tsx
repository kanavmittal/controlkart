"use client"

import { useState } from "react"
import { HttpTypes } from "@medusajs/types"
import { ProductCard } from "@/components/products/product-card"

/**
 * Client-side catalog browser/search. The page ships the catalog as static HTML
 * (great for SEO); filtering happens here without a server round-trip.
 */
export function ProductsBrowser({
  products,
}: {
  products: HttpTypes.StoreProduct[]
}) {
  const [q, setQ] = useState("")
  const query = q.trim().toLowerCase()

  const filtered = query
    ? products.filter((p) => {
        const skus = (p.variants ?? []).map((v) => v.sku ?? "").join(" ")
        const hay =
          `${p.title} ${p.subtitle ?? ""} ${(p.metadata?.mpn as string) ?? ""} ${skus}`.toLowerCase()
        return hay.includes(query)
      })
    : products

  return (
    <>
      <form
        onSubmit={(e) => e.preventDefault()}
        className="mt-4 flex max-w-md gap-2"
      >
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, SKU or model…"
          aria-label="Search products"
          className="flex-1 border border-[var(--color-line)] px-3 py-2 text-sm outline-none focus:border-[var(--color-line-strong)]"
        />
      </form>

      <p className="mt-4 text-sm text-[var(--color-ink-muted)]">
        {filtered.length} product{filtered.length === 1 ? "" : "s"}
        {query ? ` matching “${q.trim()}”` : ""} · Prices inclusive of GST
      </p>

      <div className="mt-4 grid grid-cols-1 gap-px border border-[var(--color-line)] bg-[var(--color-line)] sm:grid-cols-2 lg:grid-cols-4">
        {filtered.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {!filtered.length && (
        <p className="mt-8 text-sm text-[var(--color-ink-muted)]">
          No products matched your search.
        </p>
      )}
    </>
  )
}
