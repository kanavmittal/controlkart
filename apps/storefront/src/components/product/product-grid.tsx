import { Children, type ReactNode } from "react"

import { cn } from "@/lib/utils"

// Responsive column ramps ported from the clone's gap-based product grids
// (`collections/[handle]/page.tsx`, `collections/page.tsx`): 2 columns on
// mobile, stepping to 3 then (for the 4-col variant) 4 on desktop. Uses the
// clone's own arbitrary breakpoints for pixel fidelity rather than the
// standard Tailwind sm/md/lg scale.
const COLS = {
  3: "grid-cols-2 min-[750px]:grid-cols-3",
  4: "grid-cols-2 min-[750px]:grid-cols-3 min-[1200px]:grid-cols-4",
} as const

export interface ProductGridPromoTile {
  /** Arbitrary node spliced in as its own grid cell (e.g. an inline promo
   *  banner). Rendered as-is — give it its own sizing/background. */
  node: ReactNode
  /** Position in the children array to splice the tile into (0-based,
   *  clamped to the current child count). Matches the clone's
   *  `cells.splice(7, 0, "promo")` inline-promo pattern. */
  index: number
}

export interface ProductGridProps {
  /** ProductCards (or any grid cells) rendered by the caller. This
   *  component stays dumb — it only lays children out. */
  children: ReactNode
  columns?: 3 | 4
  className?: string
  promoTile?: ProductGridPromoTile
}

/**
 * Athens gap-based product grid.
 *
 * Ported from the clone's inline listing-grid markup
 * (`grid gap-5 grid-cols-2 min-[750px]:grid-cols-3 min-[1200px]:grid-cols-4`)
 * — NOT the legacy hairline-border grid at
 * `components/products/product-grid.tsx` (that file is untouched here;
 * its deletion owner is T57 once its last importers are rebuilt).
 *
 * Server component, no interactivity: callers render `<ProductCard />`
 * children (or skeletons — see `product-grid-skeleton.tsx`). When
 * `promoTile` is given, its node is spliced into the children array at
 * `promoTile.index` as an extra grid cell.
 */
export function ProductGrid({
  children,
  columns = 4,
  className,
  promoTile,
}: ProductGridProps) {
  const cells = Children.toArray(children)

  if (promoTile) {
    const index = Math.max(0, Math.min(promoTile.index, cells.length))
    cells.splice(
      index,
      0,
      <div key="product-grid-promo-tile">{promoTile.node}</div>
    )
  }

  return <div className={cn("grid gap-5", COLS[columns], className)}>{cells}</div>
}
