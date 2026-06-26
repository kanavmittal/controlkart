"use client"

import { useEffect, useId, useRef, useState } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import Image from "next/image"
import { useQuery } from "@tanstack/react-query"
import type { HttpTypes } from "@medusajs/types"
import { sdk } from "@/lib/sdk"
import { queryKeys } from "@/lib/query-keys"
import { formatINR } from "@/lib/format"
import { StockBadge } from "./stock-badge"
import { resolveDownloadUrl } from "./downloads-list"
import { useProductLive } from "@/lib/hooks/use-product-live"
import { useCart } from "@/lib/hooks/use-cart"
import type { SpecValueDTO, ProductDocumentDTO } from "@/lib/data/types"

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'

/**
 * Shared product quick-view. Rendered once by QuickViewProvider; `product` is
 * null while closed. Keyed by product id so switching products remounts fresh
 * state (selected variant, focus trap) while React Query keeps the per-product
 * cache. Specs, documents and live price/stock are fetched on open.
 */
export default function QuickViewModal({
  product,
  onClose,
}: {
  product: HttpTypes.StoreProduct | null
  onClose: () => void
}) {
  if (!product) return null
  return <QuickViewContent key={product.id} product={product} onClose={onClose} />
}

function QuickViewContent({
  product,
  onClose,
}: {
  product: HttpTypes.StoreProduct
  onClose: () => void
}) {
  const variants = product.variants ?? []
  const [selectedVariantId, setSelectedVariantId] = useState(variants[0]?.id)
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  const live = useProductLive(product.id)
  const { addItem } = useCart()
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)

  const specsQuery = useQuery({
    queryKey: queryKeys.productSpecs(product.id, selectedVariantId),
    queryFn: () =>
      sdk.client.fetch<{ specs: SpecValueDTO[] }>(
        `/store/products/${product.id}/specs`,
        { query: selectedVariantId ? { variant_id: selectedVariantId } : undefined }
      ),
  })
  const documentsQuery = useQuery({
    queryKey: queryKeys.productDocuments(product.id),
    queryFn: () =>
      sdk.client.fetch<{ documents: ProductDocumentDTO[] }>(
        `/store/products/${product.id}/documents`
      ),
  })

  // Body scroll lock + ESC + focus trap + return focus, all while open.
  useEffect(() => {
    const prevActive = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    panelRef.current?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
        return
      }
      if (e.key !== "Tab" || !panelRef.current) return
      const items = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
      )
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = prevOverflow
      prevActive?.focus?.()
    }
  }, [onClose])

  const variant =
    variants.find((v) => v.id === selectedVariantId) ?? variants[0]
  const brand = product.metadata?.brand as string | undefined
  const mpn = (product.metadata?.mpn as string) || variant?.sku || variants[0]?.sku

  const liveAmount = variant ? live.priceByVariant[variant.id] : undefined
  const staticAmount = variant?.calculated_price?.calculated_amount ?? null
  const price = liveAmount != null ? liveAmount : staticAmount
  const stock = variant
    ? live.stockByVariant[variant.id] ?? variant.inventory_quantity ?? 0
    : 0
  const purchasable = variant
    ? live.purchasableByVariant[variant.id] ?? stock > 0
    : false

  const images = (product.images?.map((i) => i.url).filter(Boolean) as string[]) ?? []
  const gallery = images.length
    ? images
    : product.thumbnail
      ? [product.thumbnail]
      : []
  const [activeImage, setActiveImage] = useState(gallery[0])

  const specs = specsQuery.data?.specs ?? []
  const topSpecs = [...specs]
    .sort(
      (a, b) =>
        Number(b.is_comparable) - Number(a.is_comparable) ||
        Number(b.is_filterable) - Number(a.is_filterable) ||
        a.group_order - b.group_order ||
        a.display_order - b.display_order
    )
    .slice(0, 6)

  const docs = documentsQuery.data?.documents ?? []
  const datasheet = docs.find((d) => d.type === "datasheet") ?? docs[0]

  const onAdd = async () => {
    if (!variant) return
    setAdding(true)
    try {
      await addItem.mutateAsync({ variantId: variant.id, quantity: 1 })
      setAdded(true)
      setTimeout(() => setAdded(false), 2500)
    } finally {
      setAdding(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden border border-[var(--color-line)] bg-[var(--color-surface)] outline-none sm:flex-row"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close quick view"
          className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center border border-[var(--color-line)] bg-[var(--color-surface)] text-lg leading-none text-[var(--color-ink-muted)] hover:border-[var(--color-line-strong)] hover:text-[var(--color-ink)]"
        >
          ×
        </button>

        {/* Image side */}
        <div className="shrink-0 border-b border-[var(--color-line)] sm:w-[44%] sm:border-b-0 sm:border-r">
          <div className="relative aspect-square bg-[var(--color-surface-alt)]">
            {activeImage ? (
              <Image
                src={activeImage}
                alt={product.title}
                fill
                className="object-contain p-8"
                sizes="(max-width: 640px) 100vw, 40vw"
              />
            ) : (
              <span className="flex h-full items-center justify-center font-mono text-xs text-[var(--color-ink-faint)]">
                {mpn}
              </span>
            )}
          </div>
          {gallery.length > 1 && (
            <div className="flex gap-2 overflow-x-auto p-3">
              {gallery.map((url) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setActiveImage(url)}
                  aria-label="View image"
                  className={`relative h-14 w-14 shrink-0 border bg-[var(--color-surface-alt)] ${
                    url === activeImage
                      ? "border-[var(--color-line-strong)]"
                      : "border-[var(--color-line)]"
                  }`}
                >
                  <Image
                    src={url}
                    alt=""
                    fill
                    className="object-contain p-1.5"
                    sizes="56px"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info side */}
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6 pr-12">
          <div className="font-mono text-xs text-[var(--color-ink-muted)]">
            {[brand, mpn].filter(Boolean).join(" · ")}
          </div>
          <h2 id={titleId} className="text-xl font-bold leading-tight tracking-tight">
            {product.title}
          </h2>
          {product.subtitle && (
            <p className="-mt-2 text-sm text-[var(--color-ink-muted)]">
              {product.subtitle}
            </p>
          )}

          <div className="flex items-end justify-between gap-2 border-y border-[var(--color-line)] py-3">
            <div>
              {live.isLoading ? (
                <div className="h-7 w-24 animate-pulse rounded bg-[var(--color-surface-alt)]" />
              ) : (
                <div className="text-2xl font-bold">{formatINR(price)}</div>
              )}
              <div className="text-[10px] text-[var(--color-ink-faint)]">
                Incl. GST
              </div>
            </div>
            {live.isLoading ? null : !purchasable ? (
              <StockBadge quantity={0} />
            ) : stock > 0 ? (
              <StockBadge quantity={stock} />
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-ok)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-ok)]" />
                In stock
              </span>
            )}
          </div>

          {variants.length > 1 && (
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
                Select model
              </div>
              <div className="flex flex-wrap gap-2">
                {variants.map((v) => {
                  const selected = v.id === variant?.id
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariantId(v.id)}
                      className={`border px-3 py-1.5 text-left text-xs transition-colors ${
                        selected
                          ? "model-selected font-semibold"
                          : "border-[var(--color-line)] hover:border-[var(--color-ink-faint)]"
                      }`}
                    >
                      <span className="font-mono">{v.sku ?? v.title}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Key specs */}
          {specsQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-4 w-full animate-pulse rounded bg-[var(--color-surface-alt)]"
                />
              ))}
            </div>
          ) : (
            topSpecs.length > 0 && (
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
                  Key specifications
                </div>
                <dl className="border border-[var(--color-line)] text-sm">
                  {topSpecs.map((spec) => (
                    <div
                      key={spec.id}
                      className="flex justify-between gap-4 border-b border-[var(--color-line)] px-3 py-2 last:border-b-0"
                    >
                      <dt className="font-medium">{spec.attribute}</dt>
                      <dd className="text-right text-[var(--color-ink-muted)]">
                        {spec.value}
                        {spec.unit ? ` ${spec.unit}` : ""}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )
          )}

          {datasheet && (
            <a
              href={resolveDownloadUrl(datasheet.file_url)}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="inline-flex w-fit items-center gap-2 border border-[var(--color-line)] px-3 py-1.5 text-xs font-medium hover:border-[var(--color-line-strong)]"
            >
              {datasheet.title || "Datasheet"} ↓
            </a>
          )}

          <div className="mt-auto flex flex-col gap-2 pt-2 sm:flex-row">
            <button
              type="button"
              onClick={onAdd}
              disabled={adding || live.isLoading || !purchasable}
              className="btn-primary flex-1 px-4 py-2.5"
            >
              {adding
                ? "Adding…"
                : added
                  ? "Added to Cart ✓"
                  : live.isLoading
                    ? "Loading…"
                    : !purchasable
                      ? "Out of Stock"
                      : "Add to Cart"}
            </button>
            <Link
              href={`/products/${product.handle}`}
              onClick={onClose}
              className="btn-secondary flex-1 px-4 py-2.5 text-center"
            >
              View full details
            </Link>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
