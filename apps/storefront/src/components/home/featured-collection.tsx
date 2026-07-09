/**
 * Home FeaturedCollection (T56) — clone ref: my-clone `src/components/FeaturedCollection.tsx`.
 *
 * Server component: a 4-col grid of 7 `ProductCard`s ("PLCs & Automation" on
 * ControlKart) with an 8th cell that's a promo tile (image, dark bottom
 * gradient, blue top-left notch, heading/caption/CTA) instead of a card. No
 * interactivity of its own — the only client leaf is `ProductCardActions`
 * inside each card (T15), so no "use client" boundary here.
 *
 * Data is NOT read from `@/config/home` directly (unlike the other T54/T56
 * components) — T57 (home assembly) resolves `featuredCollection.handles`
 * (see `@/config/types` `FeaturedCollectionConfig`) to live
 * `HttpTypes.StoreProduct[]` via `lib/data/products.ts` and passes them down,
 * matching every other product-bearing home section's "config holds handles,
 * component takes live data" split.
 *
 * Grid: deliberately ported the clone's OWN grid/scroll classes
 * (`flex ... overflow-x-auto snap-x athens-no-scrollbar md:grid md:grid-cols-3
 * lg:grid-cols-4`) rather than routing through `product/product-grid.tsx`'s
 * `promoTile` splice slot. `ProductGrid` fits the "splice an extra cell into
 * an N-column grid" *mechanism*, but not the *layout*: this section has a
 * clone-specific horizontal snap-scroll strip on mobile (each card
 * `w-[70%] shrink-0 snap-start`) that becomes a plain 3/4-col grid at
 * `md`/`lg`, whereas `ProductGrid` is a fixed 2/3/4-col grid at its own
 * `min-[750px]`/`min-[1200px]` breakpoints with no scroll-snap mode. Forcing
 * this section onto `ProductGrid` would silently drop the horizontal-scroll
 * mobile interaction the clone actually ships here. (`promo-tiles-row.tsx`
 * — T44 — made the same call for the same reason.)
 *
 * One deliberate deviation from the clone: the promo tile's CTA uses the
 * canonical shadcn `Button` (`variant="default"`, the translated
 * `.athens-btn`) instead of the clone's raw `athens-btn` class on a bare
 * `<Link>`, per the plan's "no raw athens-btn* classes on app components"
 * rule.
 */

import Image from "next/image"
import Link from "next/link"
import type { HttpTypes } from "@medusajs/types"

import { Button } from "@/components/ui/button"
import { SectionHeading } from "@/components/shared/section-heading"
import { ProductCard } from "@/components/product/product-card"
import type { PromoTile } from "@/config/types"

export interface FeaturedCollectionProps {
  heading: string
  products: HttpTypes.StoreProduct[]
  promoTile?: PromoTile
}

export function FeaturedCollection({
  heading,
  products,
  promoTile,
}: FeaturedCollectionProps) {
  return (
    <section className="athens-container my-[60px]">
      <SectionHeading title={heading} />
      <div className="athens-no-scrollbar flex snap-x gap-4 overflow-x-auto md:grid md:grid-cols-3 md:gap-5 md:overflow-visible lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            className="w-[70%] shrink-0 snap-start md:w-auto md:shrink"
          />
        ))}
        {/* Promo tile: fills the 8th cell, stretching to the row height */}
        {promoTile ? (
          <div className="relative w-[70%] min-h-[420px] shrink-0 snap-start overflow-hidden rounded-[5px] md:w-auto md:shrink">
            {promoTile.image ? (
              <Image
                src={promoTile.image}
                alt={promoTile.title}
                fill
                sizes="(min-width: 1200px) 303px, (min-width: 750px) 33vw, 90vw"
                className="object-cover"
              />
            ) : null}
            {/* Blue notch, top-left */}
            <div className="absolute left-0 top-0 z-[2] h-[8px] w-[42px] bg-[#004FC7]" />
            {/* Bottom gradient scrim */}
            <div
              className="absolute inset-0 z-[1]"
              style={{
                background:
                  "linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,0.8) 100%)",
              }}
            />
            {/* Content, bottom-left */}
            <div className="absolute inset-x-0 bottom-0 z-[2] p-[30px]">
              <h3 className="mb-2 text-[24px] font-medium leading-[1.3] text-white">
                {promoTile.title}
              </h3>
              <p className="mb-5 text-[15px] leading-[1.6] text-white/90">
                {promoTile.caption}
              </p>
              <Button render={<Link href={promoTile.href} />}>
                {promoTile.ctaLabel}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
