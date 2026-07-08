"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import type { HttpTypes } from "@medusajs/types"
import { Box, CreditCard, Minus, Plus, Settings, Truck, type LucideIcon } from "lucide-react"
import { toast } from "sonner"

import { Button, buttonVariants } from "@/components/ui/button"
import { Price } from "@/components/shared/price"
import { StockPill } from "@/components/shared/stock-pill"
import { useCart } from "@/lib/hooks/use-cart"
import { useCartDrawer } from "@/components/cart/cart-drawer-context"
import { useProductLive } from "@/lib/hooks/use-product-live"
import { useProductSelection } from "@/components/providers/product-selection-provider"
import { cn } from "@/lib/utils"
import type { PdpHighlight, PdpHighlightIconKey, PdpInfoBox } from "@/config/types"

export type BuyBoxInfoBox = PdpInfoBox

// Highlight icon key -> lucide icon, same pattern as `layout/footer-features.tsx`'s
// `FooterFeatureIconKey` map.
const highlightIconMap: Record<PdpHighlightIconKey, LucideIcon> = {
  truck: Truck,
  creditCard: CreditCard,
  settings: Settings,
}

// Visual-only stock-bar tier threshold, mirrored from `shared/stock-pill.tsx`'s
// `LOW_STOCK_THRESHOLD` (kept as a local constant rather than an import so
// this file's edits stay scoped to markup/config wiring, per the post-review
// fix's file list — it drives the progress-bar fill/color only, never the
// purchasable/qty-clamping rules below, which still come from `useProductLive`).
const STOCK_BAR_LOW_THRESHOLD = 5

interface BuyBoxProps {
  product: HttpTypes.StoreProduct
  /** Optional Athens "info box" (blue callout, `product-info-box-block`)
   *  below the buy row — config-fed (`pdpContent.infoBox`), renders nothing
   *  when absent. */
  infoBox?: BuyBoxInfoBox
  /** Optional highlight chip row (Athens `product-block-highlights`) —
   *  config-fed (`pdpContent.highlights`), renders nothing when absent. */
  highlights?: PdpHighlight[]
  /** Caption under the stock pill on the stock bar, e.g. "Usually ships
   *  within 24 hours" (`pdpContent.shipsCaption`). */
  shipsCaption?: string
}

/**
 * PDP buy column body (Athens `product-info` blocks 4-10): price block,
 * stock bar, variant selector, buy row, info box, highlights, "got
 * questions". Blocks 1-3 (eyebrow/title/SKU/divider) now live in
 * `product-summary.tsx`, rendered just above this component.
 *
 * Ported verbatim from `products/purchase-panel.tsx` (kept alive for the old
 * PDP until T29 deletes it): same `useProductSelection` variant, same
 * `useProductLive` price/stock/purchasable-per-variant derivation, same qty
 * clamping (`maxQty` = tracked stock, or 99 for untracked/backorder, or 0
 * when unpurchasable) and reset-on-variant-change effect, same Buy Now
 * semantics (add the line, then `router.push("/checkout")`, no toast), same
 * Request Bulk Quote `?sku=` link, same HSN + `metadata.footnote` copy. This
 * post-review pass only restructures markup/ordering and reshapes the
 * `infoBox`/`highlights` props to match the Athens block layout — no hook,
 * mutation, or business-rule change.
 *
 * Restyled: Add to cart follows the app-wide `product-card-actions.tsx`
 * pattern (`addItem.mutate` + sonner toast + cart-drawer `openDrawer`)
 * instead of the old panel's inline "Added to Cart ✓" text swap. Still
 * invalidates the `product-live` query on a successful add so stock reflects
 * immediately, same as before.
 */
export function BuyBox({ product, infoBox, highlights, shipsCaption }: BuyBoxProps) {
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

  // Visual-only tier for the stock progress bar (Athens `stock-bar-progress`):
  // full green when in stock, amber partial when low, red/empty when out.
  const stockBarTier: "in" | "low" | "out" = !purchasable
    ? "out"
    : stock <= STOCK_BAR_LOW_THRESHOLD
      ? "low"
      : "in"
  const stockBarFillPercent = stockBarTier === "in" ? 100 : stockBarTier === "low" ? 45 : 0
  const stockBarFillClass =
    stockBarTier === "in"
      ? "bg-[var(--color-athens-success)]"
      : stockBarTier === "low"
        ? "bg-[var(--color-athens-warning)]"
        : "bg-destructive"

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
      {/* Block 4: price */}
      <div className="mb-5">
        {live.isLoading ? (
          <div className="h-7 w-28 animate-pulse rounded bg-[var(--color-athens-band)]" />
        ) : (
          <div className="flex flex-wrap items-baseline gap-x-1.5">
            <Price amount={price} originalAmount={originalPrice} />
            <sup className="text-[11px] leading-none font-normal text-[var(--color-athens-body)]">
              Inclusive of GST
            </sup>
          </div>
        )}
        <p className="mt-1 text-xs text-[var(--color-athens-body)]">HSN: {hsn}</p>
      </div>

      {/* Block 5: stock bar */}
      <div className="mb-5">
        {live.isLoading ? (
          <span className="text-xs text-[var(--color-athens-body)]">
            Checking stock…
          </span>
        ) : live.isError ? (
          <span className="text-xs text-destructive">
            Live data unavailable
          </span>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <StockPill availableQuantity={stock} canBackorder={canBackorder} />
              {shipsCaption ? (
                <span className="text-[15px] text-[var(--color-athens-dark)]">
                  {shipsCaption}
                </span>
              ) : null}
            </div>
            <div
              className={cn(
                "mt-3 h-[3px] w-full overflow-hidden rounded-full",
                stockBarTier === "out"
                  ? "bg-destructive/15"
                  : "bg-[var(--color-athens-line)]"
              )}
            >
              <div
                className={cn("h-full rounded-full transition-all", stockBarFillClass)}
                style={{ width: `${stockBarFillPercent}%` }}
              />
            </div>
          </>
        )}
      </div>

      {live.isError && (
        <p className="mb-4 text-xs text-[var(--color-athens-body)]">
          Couldn’t load live price &amp; stock. Refresh to retry, or request a
          quote below.
        </p>
      )}

      {/* Block 6: variant selector (only when there's a real choice) */}
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

      {/* Block 7: buy row */}
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

      {/* Block 8: info box */}
      {infoBox && (
        <div className="mt-6 flex gap-4 rounded-[5px] bg-[#f0f6ff] p-5">
          <Box className="mt-0.5 size-6 shrink-0 text-primary" aria-hidden />
          <div>
            <p className="text-[15px] font-medium text-primary">{infoBox.heading}</p>
            <p className="mt-1 text-[14px] leading-[22px] text-primary/90">
              {infoBox.caption}
            </p>
          </div>
        </div>
      )}

      {/* Block 9: highlights */}
      {highlights && highlights.length > 0 && (
        <div className="mt-5 flex flex-col gap-3 min-[750px]:flex-row">
          {highlights.map((h) => {
            const Icon = h.icon ? highlightIconMap[h.icon] : null
            return (
              <div
                key={h.text}
                className="flex flex-1 items-center justify-center gap-2 rounded-[5px] px-3 py-3 text-[13px] text-[var(--color-athens-dark)] shadow-[inset_0_0_0_1px_var(--color-athens-line)]"
              >
                {Icon ? <Icon className="size-5 text-[var(--color-athens-body)]" aria-hidden /> : null}
                {h.text}
              </div>
            )
          })}
        </div>
      )}

      {/* Block 10: got questions */}
      <div className="mt-8 text-[15px]">
        <p className="text-[var(--color-athens-dark)]">Got questions?</p>
        <p className="text-[var(--color-athens-body)]">
          Feel free to{" "}
          <Link href="/pages/contact-us" className="text-primary hover:underline">
            get in touch
          </Link>
        </p>
      </div>
    </div>
  )
}
