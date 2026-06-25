import Link from "next/link"
import Image from "next/image"
import { HttpTypes } from "@medusajs/types"
import { formatINR } from "@/lib/format"
import { StockBadge } from "./stock-badge"

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
  const mpn = (product.metadata?.mpn as string) || variants[0]?.sku
  // Second distinct image (if any) fades in on hover — pure CSS, no JS.
  const hoverImage = product.images?.find(
    (i) => i.url && i.url !== product.thumbnail
  )?.url

  return (
    <Link
      href={`/products/${product.handle}`}
      className="group flex flex-col border border-[var(--color-line)] bg-[var(--color-surface)] transition-colors hover:border-[var(--color-line-strong)]"
    >
      <div className="relative flex aspect-square items-center justify-center border-b border-[var(--color-line)] bg-[var(--color-surface-alt)] p-6">
        {product.thumbnail ? (
          <>
            <Image
              src={product.thumbnail}
              alt={product.title}
              fill
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
      <div className="flex flex-1 flex-col gap-2 p-4">
        {mpn && (
          <span className="font-mono text-xs text-[var(--color-ink-muted)]">
            {mpn}
          </span>
        )}
        <h3 className="text-sm font-semibold leading-snug group-hover:text-[var(--color-accent)]">
          {product.title}
        </h3>
        {product.subtitle && (
          <p className="text-xs leading-relaxed text-[var(--color-ink-muted)]">
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
  )
}
