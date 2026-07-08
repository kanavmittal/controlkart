"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import type { HttpTypes } from "@medusajs/types"
import { Minus, Plus } from "lucide-react"
import { toast } from "sonner"

import { Button, buttonVariants } from "@/components/ui/button"
import { Price } from "@/components/shared/price"
import { StockPill } from "@/components/shared/stock-pill"
import { useCart } from "@/lib/hooks/use-cart"
import { useCartDrawer } from "@/components/cart/cart-drawer-context"
import { useProductLive } from "@/lib/hooks/use-product-live"
import { useProductSelection } from "@/components/providers/product-selection-provider"
import { cn } from "@/lib/utils"

export interface BuyBoxInfoBox {
  title: string
  lines: string[]
}

interface BuyBoxProps {
  product: HttpTypes.StoreProduct
  /** Optional Athens "info box" (blue callout) below the CTAs — config-fed,
   *  renders nothing when absent. Owner: T29. */
  infoBox?: BuyBoxInfoBox
  /** Optional highlight chip row (e.g. "Free shipping") — config-fed,
   *  renders nothing when absent. Owner: T29. */
  highlights?: string[]
}

/**
 * PDP buy column: variant selector, live price/stock, qty stepper, Add to
 * cart / Buy Now, Request Bulk Quote, HSN + footnote.
 *
 * Ported verbatim from `products/purchase-panel.tsx` (kept alive for the old
 * PDP until T29 deletes it): same `useProductSelection` variant, same
 * `useProductLive` price/stock/purchasable-per-variant derivation, same qty
 * clamping (`maxQty` = tracked stock, or 99 for untracked/backorder, or 0
 * when unpurchasable) and reset-on-variant-change effect, same Buy Now
 * semantics (add the line, then `router.push("/checkout")`, no toast), same
 * Request Bulk Quote `?sku=` link, same HSN + `metadata.footnote` copy.
 *
 * Restyled: Add to cart now follows the app-wide `product-card-actions.tsx`
 * pattern (`addItem.mutate` + sonner toast + cart-drawer `openDrawer`)
 * instead of the old panel's inline "Added to Cart ✓" text swap. Still
 * invalidates the `product-live` query on a successful add so stock reflects
 * immediately, same as before.
 */
export function BuyBox({ product, infoBox, highlights }: BuyBoxProps) {
  const variants = product.variants ?? []
  // Selected variant lives in shared PDP context so the (T26) gallery and
  // this buy column — separate subtrees — stay in sync.
  const { selectedVariantId: variantId, setSelectedVariantId: setVariantId } =
    useProductSelection()
  const [quantity, setQuantity] = useState(1)
  const [pendingAction, setPendingAction] = useState<"add" | "buyNow" | null>(
    null
  )
  const router = useRouter()
  const queryClient = useQueryClient()
  const { addItem } = useCart()
  const { openDrawer } = useCartDrawer()

  // Live price + stock (browser fetch, uncached).
  const live = useProductLive(product.id)

  const variant = useMemo(
    () => variants.find((v) => v.id === variantId) ?? variants[0],
    [variants, variantId]
  )
  const stock = variant ? live.stockByVariant[variant.id] ?? 0 : 0
  const price = variant ? live.priceByVariant[variant.id] ?? null : null
  const originalPrice = variant?.calculated_price?.original_amount ?? null
  const purchasable = variant
    ? live.purchasableByVariant[variant.id] ?? false
    : false
  const canBackorder =
    variant?.manage_inventory === false || variant?.allow_backorder === true
  // Managed in-stock caps at the count; non-tracked/backorder caps at a sane max.
  const maxQty = purchasable ? (stock > 0 ? stock : 99) : 0
  const controlsDisabled = live.isLoading || live.isError || !purchasable
  const mutationPending = addItem.isPending

  // Reset quantity to 1 whenever the selected variant changes (from any source).
  useEffect(() => {
    setQuantity(1)
  }, [variantId])

  // If a live refetch lowers stock below the current selection, clamp it down.
  useEffect(() => {
    if (!live.isLoading) setQuantity((q) => Math.min(q, Math.max(1, maxQty)))
  }, [maxQty, live.isLoading])

  const onAdd = () => {
    if (!variant) return
    setPendingAction("add")
    addItem.mutate(
      { variantId: variant.id, quantity: Math.min(quantity, maxQty) },
      {
        onSuccess: () => {
          toast.success(`Added ${product.title} to cart`)
          openDrawer()
          queryClient.invalidateQueries({
            queryKey: ["product-live", product.id],
          })
        },
        onError: () => {
          toast.error("Couldn't add to cart. Please try again.")
        },
        onSettled: () => setPendingAction(null),
      }
    )
  }

  const onBuyNow = () => {
    if (!variant) return
    setPendingAction("buyNow")
    addItem.mutate(
      { variantId: variant.id, quantity: Math.min(quantity, maxQty) },
      {
        onSuccess: () => {
          router.push("/checkout")
        },
        onError: () => {
          toast.error("Couldn't add to cart. Please try again.")
        },
        onSettled: () => setPendingAction(null),
      }
    )
  }

  const footnote = (product.metadata?.footnote as string | undefined)?.trim()
  const hsn = String(product.metadata?.hsn_code ?? "8537")

  return (
    <div>
      {variants.length > 1 && (
        <div className="mb-5">
          <div className="mb-2 text-xs font-semibold tracking-wide text-[var(--color-athens-body)] uppercase">
            Select Model
          </div>
          <div className="grid gap-2">
            {variants.map((v) => {
              const selected = v.id === variant?.id
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVariantId(v.id)}
                  className={cn(
                    "border px-3 py-2.5 text-left text-sm transition-colors",
                    selected
                      ? "border-primary bg-primary/5 font-semibold text-primary"
                      : "border-[var(--color-athens-line)] hover:border-[var(--color-athens-dark)]"
                  )}
                >
                  <div className="font-mono text-xs text-[var(--color-athens-body)]">
                    {v.sku}
                  </div>
                  <div>{v.title}</div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <hr className="my-5 border-0 border-t border-[var(--color-athens-line)]" />

      <div className="mb-5">
        {live.isLoading ? (
          <div className="h-7 w-28 animate-pulse rounded bg-[var(--color-athens-band)]" />
        ) : (
          <Price amount={price} originalAmount={originalPrice} />
        )}
        <p className="mt-1 text-xs text-[var(--color-athens-body)]">
          Inclusive of GST · HSN {hsn}
        </p>
      </div>

      <div className="mb-5 flex items-center gap-4">
        {live.isLoading ? (
          <span className="text-xs text-[var(--color-athens-body)]">
            Checking stock…
          </span>
        ) : live.isError ? (
          <span className="text-xs text-destructive">
            Live data unavailable
          </span>
        ) : (
          <StockPill availableQuantity={stock} canBackorder={canBackorder} />
        )}
      </div>

      {live.isError && (
        <p className="mb-4 text-xs text-[var(--color-athens-body)]">
          Couldn’t load live price &amp; stock. Refresh to retry, or request a
          quote below.
        </p>
      )}

      <div className="flex gap-3">
        <div className="flex h-11 shrink-0 items-center border border-[var(--color-athens-line)]">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="h-11 w-10 rounded-none border-0"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1 || controlsDisabled}
            aria-label="Decrease quantity"
          >
            <Minus />
          </Button>
          <span className="flex w-10 items-center justify-center text-sm font-medium tabular-nums">
            {quantity}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="h-11 w-10 rounded-none border-0"
            onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
            disabled={quantity >= maxQty || controlsDisabled}
            aria-label="Increase quantity"
          >
            <Plus />
          </Button>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="flex-1"
          onClick={onAdd}
          disabled={mutationPending || controlsDisabled}
          aria-busy={pendingAction === "add"}
        >
          {pendingAction === "add"
            ? "Adding…"
            : live.isLoading
              ? "Loading…"
              : live.isError
                ? "Unavailable"
                : !purchasable
                  ? "Out of Stock"
                  : "Add to Cart"}
        </Button>
      </div>

      <Button
        type="button"
        onClick={onBuyNow}
        disabled={mutationPending || controlsDisabled}
        aria-busy={pendingAction === "buyNow"}
        className="mt-2 w-full"
      >
        {pendingAction === "buyNow" ? "Redirecting…" : "Buy Now"}
      </Button>

      <Link
        href={`/request-quote?sku=${variant?.sku ?? ""}`}
        className={cn(buttonVariants({ variant: "outline" }), "mt-2 block w-full text-center")}
      >
        Request Bulk Quote
      </Link>

      {footnote && (
        <p className="mt-4 border-l-2 border-[var(--color-athens-dark)] bg-[var(--color-athens-band)] px-3 py-2.5 text-xs leading-relaxed whitespace-pre-line text-[var(--color-athens-body)]">
          {footnote}
        </p>
      )}

      {infoBox && (
        <div className="mt-6 rounded-[5px] bg-[#f0f6ff] p-5">
          <p className="text-[15px] font-medium text-primary">{infoBox.title}</p>
          <ul className="mt-1 space-y-1 text-[14px] leading-[22px] text-primary/90">
            {infoBox.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      {highlights && highlights.length > 0 && (
        <div className="mt-5 flex flex-col gap-3 min-[750px]:flex-row">
          {highlights.map((h) => (
            <div
              key={h}
              className="flex flex-1 items-center justify-center rounded-[5px] px-3 py-3 text-center text-[13px] text-[var(--color-athens-dark)] shadow-[inset_0_0_0_1px_var(--color-athens-line)]"
            >
              {h}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
