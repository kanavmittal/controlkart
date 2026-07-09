import type { HttpTypes } from "@medusajs/types"

import { cn } from "@/lib/utils"

export type ProductBadgeVariant = "sale" | "new" | "sold-out"

export interface ProductBadge {
  variant: ProductBadgeVariant
  label: string
}

const NEW_WINDOW_MS = 30 * 24 * 60 * 60 * 1000

/** Largest discount percent across variants with a valid calculated <
 *  original price, or `null` when no variant is on sale / price fields are
 *  missing. Defensive: never throws on partial/missing price data. */
function maxDiscountPercent(product: HttpTypes.StoreProduct): number | null {
  const variants = product.variants ?? []
  let maxPercent: number | null = null

  for (const variant of variants) {
    const calculated = variant.calculated_price?.calculated_amount
    const original = variant.calculated_price?.original_amount
    if (
      typeof calculated !== "number" ||
      typeof original !== "number" ||
      original <= 0 ||
      calculated >= original
    ) {
      continue
    }
    const percent = Math.round(((original - calculated) / original) * 100)
    if (percent > 0 && (maxPercent === null || percent > maxPercent)) {
      maxPercent = percent
    }
  }

  return maxPercent
}

function isNewProduct(product: HttpTypes.StoreProduct): boolean {
  if (!product.created_at) return false
  const created = new Date(product.created_at).getTime()
  if (Number.isNaN(created)) return false
  return Date.now() - created <= NEW_WINDOW_MS
}

/** True when no variant is currently purchasable (mirrors the static
 *  `manage_inventory === false || allow_backorder === true ||
 *  inventory_quantity > 0` rule from `use-product-live.ts`, evaluated
 *  against the SSR/ISR product payload rather than live data). Defensive:
 *  a product with no variants is never flagged sold-out (insufficient
 *  data to say either way). */
function isProductSoldOut(product: HttpTypes.StoreProduct): boolean {
  const variants = product.variants ?? []
  if (variants.length === 0) return false
  return !variants.some((variant) => {
    if (variant.manage_inventory === false) return true
    if (variant.allow_backorder === true) return true
    return (variant.inventory_quantity ?? 0) > 0
  })
}

/** Derives card/PDP badges (sale/new/sold-out) from a Medusa product.
 *  Defensive: missing/partial price or inventory fields simply omit the
 *  corresponding badge rather than throwing. No ratings badge (omitted by
 *  decision). */
export function deriveProductBadges(product: HttpTypes.StoreProduct): ProductBadge[] {
  const badges: ProductBadge[] = []

  const discountPercent = maxDiscountPercent(product)
  if (discountPercent !== null) {
    badges.push({ variant: "sale", label: `-${discountPercent}%` })
  }

  if (isNewProduct(product)) {
    badges.push({ variant: "new", label: "New" })
  }

  if (isProductSoldOut(product)) {
    badges.push({ variant: "sold-out", label: "Sold out" })
  }

  return badges
}

const badgeStyles: Record<ProductBadgeVariant, string> = {
  sale: "bg-[var(--color-athens-sale-badge)] text-white",
  new: "bg-[var(--color-athens-blue-light)] text-white",
  "sold-out": "bg-[var(--color-athens-dark)] text-white",
}

// Badge pills pinned to the top of card/PDP media. Clone ref:
// my-clone/src/components/ProductCard.tsx badge markup.
export function ProductBadges({ badges, className }: { badges: ProductBadge[]; className?: string }) {
  if (badges.length === 0) return null

  return (
    <div className={cn("flex flex-wrap items-start gap-[5px]", className)}>
      {badges.map((badge) => (
        <span
          key={badge.variant}
          className={cn(
            "inline-flex items-center rounded-[var(--radius-badge)] px-[7px] py-[2px] text-[12px] leading-[12px] font-medium uppercase",
            badgeStyles[badge.variant]
          )}
        >
          {badge.label}
        </span>
      ))}
    </div>
  )
}
