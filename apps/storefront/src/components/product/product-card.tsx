import Image from "next/image"
import Link from "next/link"
import type { ReactNode } from "react"
import type { HttpTypes } from "@medusajs/types"

import { Button } from "@/components/ui/button"
import { Price } from "@/components/shared/price"
import { StockPill } from "@/components/shared/stock-pill"
import { ProductBadges, deriveProductBadges } from "@/components/shared/product-badges"
import { cn } from "@/lib/utils"
import { ProductCardActions } from "./product-card-actions"

export interface ProductCardSpec {
  label: string
  value: string
}

export interface ProductCardProps {
  product: HttpTypes.StoreProduct
  /** Optional inline spec lines (e.g. "Voltage: 230V"). Callers opt in per
   *  listing context — the card renders none by default. */
  specs?: ProductCardSpec[]
  /** Overlay quick-view trigger rendered over the media block. The old
   *  `quick-view-button.tsx` is being replaced in T24 (not yet run), so this
   *  card takes no dependency on it — callers pass their own trigger.
   *  Renders nothing when omitted. */
  quickViewSlot?: ReactNode
  /** Optional compare-tray control (e.g. `CompareCardCheckbox`), rendered
   *  small/unobtrusive in the footer next to the CTA. Callers opt in per
   *  listing context — the card renders nothing when omitted. */
  compareSlot?: ReactNode
  className?: string
  /** Forwarded to `next/image` for above-the-fold cards (disables lazy
   *  loading on the primary thumbnail only). */
  priority?: boolean
}

/**
 * Flagship catalog unit — Athens structure ported from
 * `my-clone/src/components/ProductCard.tsx` (square media, hover
 * cross-fade, badges, vendor·SKU, title, inline specs, stock pill, price,
 * footer CTA), wired to live Medusa data instead of the clone's static
 * `Product` mock. No rating stars (omitted by decision).
 *
 * Derivations carried over from the old `products/product-card.tsx`: min
 * calculated price across variants, aggregated stock, `metadata.brand`,
 * `metadata.mpn` falling back to the first variant's `sku`, "N models" from
 * `variants.length`, and the hover image (first product image that differs
 * from the thumbnail).
 *
 * The card is a server-renderable shell: the only client-interactive piece
 * (single-variant "Add to cart", which needs `useCart()` + a toast + the
 * cart drawer) is split into `product-card-actions.tsx`.
 */
export function ProductCard({
  product,
  specs = [],
  quickViewSlot,
  compareSlot,
  className,
  priority = false,
}: ProductCardProps) {
  const variants = product.variants ?? []

  const priceEntries = variants
    .map((variant) => variant.calculated_price)
    .filter(
      (price): price is NonNullable<typeof price> =>
        typeof price?.calculated_amount === "number"
    )
  const cheapestPrice = priceEntries.length
    ? priceEntries.reduce((min, price) =>
        price.calculated_amount! < min.calculated_amount! ? price : min
      )
    : null
  const distinctCalculatedAmounts = new Set(
    priceEntries.map((price) => price.calculated_amount)
  )
  const priceFrom = variants.length > 1 && distinctCalculatedAmounts.size > 1

  const totalStock = variants.reduce(
    (acc, variant) => acc + (variant.inventory_quantity ?? 0),
    0
  )
  // Untracked/backorderable variants read as purchasable even at 0 tracked
  // qty — mirrors `use-product-live.ts`'s `purchasableByVariant` rule (see
  // `StockPill`'s own doc comment).
  const canBackorder = variants.some(
    (variant) =>
      variant.manage_inventory === false || variant.allow_backorder === true
  )

  const brand = product.metadata?.brand as string | undefined
  const mpn = (product.metadata?.mpn as string | undefined) || variants[0]?.sku || undefined
  const modelCount = variants.length
  const multiVariant = modelCount > 1

  // Second distinct image (if any) cross-fades in on hover — pure CSS.
  const hoverImage = product.images?.find(
    (image) => image.url && image.url !== product.thumbnail
  )?.url

  const badges = deriveProductBadges(product)
  const href = `/products/${product.handle}`
  const singleVariantId = !multiVariant ? variants[0]?.id : undefined

  return (
    <article
      className={cn(
        "group relative flex flex-col gap-4 rounded-[var(--radius)] border border-border bg-white p-4 transition-shadow",
        "hover:shadow-[0_2px_0_0_rgba(223,223,223,0.2)]",
        className
      )}
    >
      <figure className="relative m-0">
        <Link href={href} className="block">
          <div className="relative aspect-square overflow-hidden rounded-[calc(var(--radius)-2px)] bg-[var(--color-athens-band)]">
            {product.thumbnail ? (
              <Image
                src={product.thumbnail}
                alt={product.title}
                fill
                priority={priority}
                loading={priority ? undefined : "lazy"}
                sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 90vw"
                className={cn(
                  "object-cover transition-opacity duration-[250ms]",
                  hoverImage && "group-hover:opacity-0"
                )}
              />
            ) : (
              <div className="flex size-full items-center justify-center px-4 text-center font-mono text-xs text-[var(--color-athens-body)]">
                {mpn ?? product.title}
              </div>
            )}
            {hoverImage ? (
              <Image
                src={hoverImage}
                alt=""
                aria-hidden
                fill
                loading="lazy"
                sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 90vw"
                className="object-cover opacity-0 transition-opacity duration-[250ms] group-hover:opacity-100"
              />
            ) : null}
          </div>
        </Link>

        <div className="pointer-events-none absolute inset-x-0 top-0 z-[5] p-2">
          <ProductBadges badges={badges} className="pointer-events-auto" />
        </div>

        {quickViewSlot ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] flex justify-center p-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100">
            <div className="pointer-events-auto">{quickViewSlot}</div>
          </div>
        ) : null}
      </figure>

      <div className="flex flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-baseline gap-x-[6px] text-[13px] leading-[20.8px] text-[var(--color-athens-body)]">
          {brand ? <span>{brand}</span> : null}
          {brand && mpn ? <span aria-hidden>·</span> : null}
          {mpn ? <span>{mpn}</span> : null}
        </div>

        <h3 className="line-clamp-2 min-h-[2.5em] text-[15px] leading-[19.5px] font-normal text-[var(--color-athens-dark)]">
          <Link href={href} className="hover:underline">
            {product.title}
          </Link>
        </h3>

        {specs.length > 0 ? (
          <div className="flex flex-wrap gap-x-1 text-[13px] leading-4 text-[var(--color-athens-body)]">
            {specs.map((spec, index) => (
              <span key={spec.label}>
                {index > 0 ? ", " : ""}
                {spec.label}:{" "}
                <strong className="font-medium text-[var(--color-athens-dark)]">
                  {spec.value}
                </strong>
              </span>
            ))}
          </div>
        ) : null}

        <StockPill availableQuantity={totalStock} canBackorder={canBackorder} />

        {multiVariant ? (
          <p className="text-[13px] text-[var(--color-athens-body)]">{modelCount} models</p>
        ) : null}

        <Price
          amount={cheapestPrice?.calculated_amount ?? null}
          originalAmount={cheapestPrice?.original_amount ?? null}
          from={priceFrom}
          taxNote
          className="mt-auto"
        />
      </div>

      <div className="flex flex-col gap-2">
        {multiVariant ? (
          <Button variant="outline" className="w-full" render={<Link href={href} />}>
            Select options
          </Button>
        ) : singleVariantId ? (
          <ProductCardActions variantId={singleVariantId} productTitle={product.title} />
        ) : null}
        {compareSlot ? <div className="flex justify-center">{compareSlot}</div> : null}
      </div>
    </article>
  )
}
