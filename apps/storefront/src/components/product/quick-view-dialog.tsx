"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useQuery } from "@tanstack/react-query"
import type { HttpTypes } from "@medusajs/types"
import { toast } from "sonner"
import { Download, Loader2 } from "lucide-react"

import { sdk } from "@/lib/sdk"
import { queryKeys } from "@/lib/query-keys"
import { useProductLive } from "@/lib/hooks/use-product-live"
import { useCart } from "@/lib/hooks/use-cart"
import { useCartDrawer } from "@/components/cart/cart-drawer-context"
import { resolveDownloadUrl } from "@/components/product/download-utils"
import type { SpecValueDTO, ProductDocumentDTO } from "@/lib/data/types"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Price } from "@/components/shared/price"
import { StockPill } from "@/components/shared/stock-pill"
import { cn } from "@/lib/utils"

/**
 * Shared product quick-view, rebuilt on shadcn `Dialog` (Base UI). Mounted
 * once by `QuickViewProvider`; `product` is null while closed. Ported
 * verbatim from the old `products/quick-view-modal.tsx`: per-variant specs
 * (`/store/products/:id/specs`) + documents (`/store/products/:id/documents`)
 * fetches, live price/stock via `useProductLive`, the variant switcher, the
 * datasheet download, and the keyed-by-product-id remount (switching
 * products resets local state — selected variant, active image — while
 * React Query keeps each product's cache). `Dialog`'s built-ins replace the
 * old hand-rolled portal/focus-trap/scroll-lock. Add-to-cart now follows the
 * app-wide pattern (`useCart` + sonner toast + cart-drawer `openDrawer`)
 * instead of the old modal's inline "Added ✓" button state.
 */
export default function QuickViewDialog({
  product,
  onClose,
}: {
  product: HttpTypes.StoreProduct | null
  onClose: () => void
}) {
  // Keep rendering the last-opened product through the close animation so
  // the dialog doesn't flash empty while the popup fades/zooms out.
  const [lastProduct, setLastProduct] = useState<HttpTypes.StoreProduct | null>(
    null
  )
  useEffect(() => {
    if (product) setLastProduct(product)
  }, [product])

  return (
    <Dialog
      open={!!product}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="grid w-full max-w-[calc(100%-2rem)] grid-cols-1 gap-0 overflow-hidden p-0 sm:max-w-3xl sm:grid-cols-2 lg:max-w-4xl">
        {lastProduct ? (
          <QuickViewContent
            key={lastProduct.id}
            product={lastProduct}
            onClose={onClose}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
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

  const live = useProductLive(product.id)
  const { addItem } = useCart()
  const { openDrawer } = useCartDrawer()

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

  const variant = variants.find((v) => v.id === selectedVariantId) ?? variants[0]
  const brand = product.metadata?.brand as string | undefined
  const mpn = (product.metadata?.mpn as string) || variant?.sku || variants[0]?.sku

  const liveAmount = variant ? live.priceByVariant[variant.id] : undefined
  const staticAmount = variant?.calculated_price?.calculated_amount ?? null
  const price = liveAmount != null ? liveAmount : staticAmount
  const originalPrice = variant?.calculated_price?.original_amount ?? null
  const stock = variant
    ? live.stockByVariant[variant.id] ?? variant.inventory_quantity ?? 0
    : 0
  const purchasable = variant
    ? live.purchasableByVariant[variant.id] ?? stock > 0
    : false
  const canBackorder =
    variant?.manage_inventory === false || variant?.allow_backorder === true

  const images = (product.images?.map((i) => i.url).filter(Boolean) as string[]) ?? []
  const gallery = images.length ? images : product.thumbnail ? [product.thumbnail] : []
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

  const onAdd = () => {
    if (!variant) return
    addItem.mutate(
      { variantId: variant.id, quantity: 1 },
      {
        onSuccess: () => {
          toast.success(`Added ${product.title} to cart`)
          openDrawer()
          onClose()
        },
        onError: () => {
          toast.error("Couldn't add to cart. Please try again.")
        },
      }
    )
  }

  return (
    <>
      {/* Media side */}
      <div className="flex flex-col border-b border-[var(--color-athens-line)] sm:border-b-0 sm:border-r">
        <div className="relative aspect-square bg-[var(--color-athens-band)]">
          {activeImage ? (
            <Image
              src={activeImage}
              alt={product.title}
              fill
              className="object-contain p-8"
              sizes="(max-width: 640px) 100vw, 40vw"
            />
          ) : (
            <span className="flex h-full items-center justify-center font-mono text-xs text-[var(--color-athens-body)]">
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
                className={cn(
                  "relative h-14 w-14 shrink-0 border bg-[var(--color-athens-band)]",
                  url === activeImage
                    ? "border-[var(--color-athens-dark)]"
                    : "border-[var(--color-athens-line)]"
                )}
              >
                <Image src={url} alt="" fill className="object-contain p-1.5" sizes="56px" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Info side */}
      <div className="flex max-h-[85vh] flex-1 flex-col gap-4 overflow-y-auto p-6 sm:pr-12">
        <div className="font-mono text-xs text-[var(--color-athens-body)]">
          {[brand, mpn].filter(Boolean).join(" · ")}
        </div>
        <DialogTitle className="text-xl leading-tight font-medium text-[var(--color-athens-dark)]">
          {product.title}
        </DialogTitle>
        {product.subtitle && (
          <p className="-mt-2 text-sm text-[var(--color-athens-body)]">{product.subtitle}</p>
        )}

        <div className="flex items-end justify-between gap-2 border-y border-[var(--color-athens-line)] py-3">
          {live.isLoading ? (
            <div className="h-7 w-24 animate-pulse rounded bg-[var(--color-athens-band)]" />
          ) : (
            <Price amount={price} originalAmount={originalPrice} taxNote />
          )}
          {live.isLoading ? null : (
            <StockPill availableQuantity={stock} canBackorder={canBackorder} />
          )}
        </div>

        {variants.length > 1 && (
          <div>
            <div className="mb-2 text-xs font-semibold tracking-wide text-[var(--color-athens-body)] uppercase">
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
                    className={cn(
                      "border px-3 py-1.5 text-left text-xs transition-colors",
                      selected
                        ? "border-primary bg-primary/5 font-semibold text-primary"
                        : "border-[var(--color-athens-line)] hover:border-[var(--color-athens-dark)]"
                    )}
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
                className="h-4 w-full animate-pulse rounded bg-[var(--color-athens-band)]"
              />
            ))}
          </div>
        ) : (
          topSpecs.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-semibold tracking-wide text-[var(--color-athens-body)] uppercase">
                Key specifications
              </div>
              <dl className="border border-[var(--color-athens-line)] text-sm">
                {topSpecs.map((spec) => (
                  <div
                    key={spec.id}
                    className="flex justify-between gap-4 border-b border-[var(--color-athens-line)] px-3 py-2 last:border-b-0"
                  >
                    <dt className="font-medium text-[var(--color-athens-dark)]">
                      {spec.attribute}
                    </dt>
                    <dd className="text-right text-[var(--color-athens-body)]">
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
            className="inline-flex w-fit items-center gap-2 border border-[var(--color-athens-line)] px-3 py-1.5 text-xs font-medium hover:border-[var(--color-athens-dark)]"
          >
            <Download className="size-3.5" aria-hidden />
            {datasheet.title || "Datasheet"}
          </a>
        )}

        <div className="mt-auto flex flex-col gap-2 pt-2 sm:flex-row">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={onAdd}
            disabled={addItem.isPending || live.isLoading || !purchasable}
            aria-busy={addItem.isPending}
          >
            {addItem.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Adding…
              </>
            ) : live.isLoading ? (
              "Loading…"
            ) : !purchasable ? (
              "Out of Stock"
            ) : (
              "Add to Cart"
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            render={<Link href={`/products/${product.handle}`} onClick={onClose} />}
          >
            View full details
          </Button>
        </div>
      </div>
    </>
  )
}
