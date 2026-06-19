"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { HttpTypes } from "@medusajs/types"
import { formatINR } from "@/lib/format"
import { StockBadge } from "./stock-badge"
import { addToCart } from "@/lib/data/cart"
import { useProductLive } from "@/lib/hooks/use-product-live"
import Link from "next/link"

/**
 * Variant selector + LIVE price/stock + add-to-cart.
 *
 * Price and stock are fetched in the browser (TanStack Query, staleTime 0) so
 * they're always fresh, instead of being baked into the ISR-cached PDP HTML.
 * The product prop supplies only STATIC variant metadata (id, sku, title).
 */
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
  const queryClient = useQueryClient()

  // Live price + stock (browser fetch, uncached).
  const live = useProductLive(product.id)

  const variant = useMemo(
    () => variants.find((v) => v.id === variantId) ?? variants[0],
    [variants, variantId]
  )
  const stock = variant ? live.stockByVariant[variant.id] ?? 0 : 0
  const price = variant ? live.priceByVariant[variant.id] ?? null : null
  const maxQty = Math.max(0, stock)
  const controlsDisabled = live.isLoading || live.isError || stock <= 0

  // If a live refetch lowers stock below the current selection, clamp it down.
  useEffect(() => {
    if (!live.isLoading) setQuantity((q) => Math.min(q, Math.max(1, maxQty)))
  }, [maxQty, live.isLoading])

  const onAdd = () => {
    if (!variant) return
    // Phase 2 seam: this server action will become
    // sdk.store.cart.createLineItem + optimistic update + cart invalidation.
    startTransition(async () => {
      await addToCart(variant.id, Math.min(quantity, maxQty))
      setAdded(true)
      queryClient.invalidateQueries({ queryKey: ["product-live", product.id] })
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
            {live.isLoading ? (
              <div className="h-8 w-28 animate-pulse rounded bg-[var(--color-surface-alt)]" />
            ) : (
              <div className="text-2xl font-bold">{formatINR(price)}</div>
            )}
            <div className="text-xs text-[var(--color-ink-faint)]">
              Inclusive of GST · HSN{" "}
              {String(product.metadata?.hsn_code ?? "8537")}
            </div>
          </div>
          {live.isLoading ? (
            <span className="text-xs text-[var(--color-ink-faint)]">
              Checking stock…
            </span>
          ) : live.isError ? (
            <span className="text-xs text-[var(--color-bad)]">
              Live data unavailable
            </span>
          ) : (
            <StockBadge quantity={stock} />
          )}
        </div>

        {live.isError && (
          <p className="text-xs text-[var(--color-ink-muted)]">
            Couldn’t load live price &amp; stock. Refresh to retry, or request a
            quote below.
          </p>
        )}

        <div className="flex gap-2">
          <div className="flex border border-[var(--color-line)]">
            <button
              type="button"
              className="px-3 py-2 text-sm disabled:opacity-40"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1 || controlsDisabled}
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
              disabled={quantity >= maxQty || controlsDisabled}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
          <button
            type="button"
            onClick={onAdd}
            disabled={pending || buyNowPending || controlsDisabled}
            className="btn-primary flex-1 px-4 py-2.5"
          >
            {pending
              ? "Adding…"
              : added
                ? "Added to Cart ✓"
                : live.isLoading
                  ? "Loading…"
                  : live.isError
                    ? "Unavailable"
                    : stock <= 0
                      ? "Out of Stock"
                      : "Add to Cart"}
          </button>
        </div>

        <button
          type="button"
          onClick={onBuyNow}
          disabled={pending || buyNowPending || controlsDisabled}
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
