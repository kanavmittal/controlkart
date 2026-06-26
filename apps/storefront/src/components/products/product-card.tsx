import Link from "next/link"
import Image from "next/image"
import { HttpTypes } from "@medusajs/types"
import { formatINR } from "@/lib/format"
import { StockBadge } from "./stock-badge"
import { QuickViewButton } from "./quick-view-button"

export function ProductCard({ product }: { product: HttpTypes.StoreProduct }) {
  const variants = product.variants ?? []
  const prices = variants
    .map((v) => v.calculated_price?.calculated_amount)
    .filter((p): p is number => typeof p === "number")
  const minPrice = prices.length ? Math.min(...prices) : null
  const totalStock = variants.reduce(
    (acc, v) => acc + (v.inventory_quantity ?? 0),
    0
  )
  const brand = product.metadata?.brand as string | undefined
  const mpn = (product.metadata?.mpn as string) || variants[0]?.sku
  const modelCount = variants.length
  // Second distinct image (if any) fades in on hover — pure CSS, no JS.
  const hoverImage = product.images?.find(
    (i) => i.url && i.url !== product.thumbnail
  )?.url

  return (
    <article className="group relative flex flex-col bg-[var(--color-surface)] transition-shadow hover:z-10 hover:[box-shadow:inset_0_0_0_1px_var(--color-line-strong)]">
      <Link
        href={`/products/${product.handle}`}
        className="flex flex-1 flex-col"
      >
        <div className="relative flex aspect-square items-center justify-center border-b border-[var(--color-line)] bg-[var(--color-surface-alt)] p-6">
          {product.thumbnail ? (
            <>
              <Image
                src={product.thumbnail}
                alt={product.title}
                fill
                loading="lazy"
                className={`object-contain p-6 transition-opacity duration-200 ${
                  hoverImage ? "group-hover:opacity-0" : ""
                }`}
                sizes="(max-width: 768px) 50vw, 25vw"
              />
              {hoverImage && (
                <Image
                  src={hoverImage}
                  alt=""
                  aria-hidden
                  fill
                  loading="lazy"
                  className="object-contain p-6 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              )}
            </>
          ) : (
            <span className="font-mono text-xs text-[var(--color-ink-faint)]">
              {mpn}
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col p-4">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            {brand && (
              <span className="font-medium text-[var(--color-ink-muted)]">
                {brand}
              </span>
            )}
            {mpn && (
              <span className="font-mono text-[var(--color-ink-muted)]">
                {mpn}
              </span>
            )}
            {modelCount > 1 && (
              <span className="text-[var(--color-ink-faint)]">
                · {modelCount} models
              </span>
            )}
          </div>
          <h3 className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug group-hover:text-[var(--color-accent)]">
            {product.title}
          </h3>
          {product.subtitle && (
            <p className="mt-1 line-clamp-1 text-xs leading-relaxed text-[var(--color-ink-muted)]">
              {product.subtitle}
            </p>
          )}
          <div className="mt-auto flex items-end justify-between gap-2 pt-3">
            <div>
              <div className="text-base font-bold">
                {prices.length > 1 ? "From " : ""}
                {formatINR(minPrice)}
              </div>
              <div className="text-[10px] text-[var(--color-ink-faint)]">
                Incl. GST
              </div>
            </div>
            <StockBadge quantity={totalStock} />
          </div>
        </div>
      </Link>
      <QuickViewButton product={product} />
    </article>
  )
}
