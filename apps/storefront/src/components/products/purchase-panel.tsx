"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { HttpTypes } from "@medusajs/types"
import { formatINR } from "@/lib/format"
import { StockBadge } from "./stock-badge"
import { addToCart } from "@/lib/data/cart"
import Link from "next/link"

/** Variant selector + price + stock + add-to-cart, quantity capped to inventory. */
export function PurchasePanel({
  product,
}: {
  product: HttpTypes.StoreProduct
}) {
  const variants = product.variants ?? []
  const [variantId, setVariantId] = useState(variants[0]?.id)
  const [quantity, setQuantity] = useState(1)
  const [pending, startTransition] = useTransition()
  const [buyNowPending, startBuyNow] = useTransition()
  const [added, setAdded] = useState(false)
  const router = useRouter()

  const variant = useMemo(
    () => variants.find((v) => v.id === variantId) ?? variants[0],
    [variants, variantId]
  )
  const stock = variant?.inventory_quantity ?? 0
  const price = variant?.calculated_price?.calculated_amount ?? null
  const maxQty = Math.max(0, stock)

  const onAdd = () => {
    if (!variant) return
    startTransition(async () => {
      await addToCart(variant.id, Math.min(quantity, maxQty))
      setAdded(true)
      setTimeout(() => setAdded(false), 2500)
    })
  }

  const onBuyNow = () => {
    if (!variant) return
    startBuyNow(async () => {
      await addToCart(variant.id, Math.min(quantity, maxQty))
      router.push("/checkout")
    })
  }

  return (
    <div className="border border-[var(--color-line)]">
      {variants.length > 1 && (
        <div className="border-b border-[var(--color-line)] p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
            Select Model
          </div>
          <div className="grid gap-2">
            {variants.map((v) => {
              const selected = v.id === variant?.id
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    setVariantId(v.id)
                    setQuantity(1)
                  }}
                  className={`border px-3 py-2.5 text-left text-sm transition-colors ${
                    selected
                      ? "model-selected font-semibold"
                      : "border-[var(--color-line)] hover:border-[var(--color-ink-faint)]"
                  }`}
                >
                  <div className="font-mono text-xs text-[var(--color-ink-muted)]">
                    {v.sku}
                  </div>
                  <div>{v.title}</div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="space-y-4 p-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-bold">{formatINR(price)}</div>
            <div className="text-xs text-[var(--color-ink-faint)]">
              Inclusive of GST · HSN{" "}
              {String(product.metadata?.hsn_code ?? "8537")}
            </div>
          </div>
          <StockBadge quantity={stock} />
        </div>

        <div className="flex gap-2">
          <div className="flex border border-[var(--color-line)]">
            <button
              type="button"
              className="px-3 py-2 text-sm disabled:opacity-40"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="flex w-12 items-center justify-center border-x border-[var(--color-line)] text-sm font-medium">
              {quantity}
            </span>
            <button
              type="button"
              className="px-3 py-2 text-sm disabled:opacity-40"
              onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
              disabled={quantity >= maxQty}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
          <button
            type="button"
            onClick={onAdd}
            disabled={pending || buyNowPending || stock <= 0}
            className="btn-primary flex-1 px-4 py-2.5"
          >
            {pending
              ? "Adding…"
              : added
                ? "Added to Cart ✓"
                : stock <= 0
                  ? "Out of Stock"
                  : "Add to Cart"}
          </button>
        </div>

        <button
          type="button"
          onClick={onBuyNow}
          disabled={pending || buyNowPending || stock <= 0}
          className="btn-secondary w-full px-4 py-2.5 text-sm"
        >
          {buyNowPending ? "Redirecting…" : "Buy Now"}
        </button>

        <Link
          href={`/request-quote?sku=${variant?.sku ?? ""}`}
          className="btn-secondary block w-full px-4 py-2.5 text-center text-sm"
        >
          Request Bulk Quote
        </Link>

        <ul className="space-y-1 border-t border-[var(--color-line)] pt-3 text-xs text-[var(--color-ink-muted)]">
          <li>Dispatch in 24-48 hrs from Mumbai warehouse</li>
          <li>GST invoice with every order</li>
          <li>Genuine Selec product with manufacturer warranty</li>
        </ul>
      </div>
    </div>
  )
}
