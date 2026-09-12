import { getCategoryBadges } from "@/lib/data/category-badges"
import { ProductBadges } from "@/components/shared/product-badges"
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

export async function FeaturedCollection({
  heading,
  products,
  promoTile,
}: FeaturedCollectionProps) {
  const badges = await getCategoryBadges()
  return (
    <section className="athens-container my-10 md:my-[60px]">
      <SectionHeading title={heading} actionLabel="View all products" actionHref="/products" />
      <div className="athens-no-scrollbar flex snap-x gap-3 overflow-x-auto md:grid md:grid-cols-3 md:gap-4 md:overflow-visible lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            className="w-[58%] shrink-0 snap-start p-3 md:w-auto md:shrink md:gap-3 md:p-3"
          />
        ))}
        {/* Promo tile: fills the 8th cell, stretching to the row height */}
        {promoTile ? (
          <div className="relative w-[58%] min-h-[360px] shrink-0 snap-start overflow-hidden rounded-[5px] md:w-auto md:shrink">
            {promoTile.image ? (
              <Image
                src={promoTile.image}
                alt={promoTile.title}
                fill
                sizes="(min-width: 1200px) 303px, (min-width: 750px) 33vw, 90vw"
                className="bg-[#f5f6f7] object-contain pb-[220px] pt-6 px-5"
              />
            ) : null}
            <ProductBadges badges={badges[promoTile.href] ?? []} className="absolute left-5 right-5 top-4 z-[2]" />
            {/* Blue notch, top-left */}
            <div className="absolute left-0 top-0 z-[2] h-[8px] w-[42px] bg-[#004FC7]" />
            {/* Bottom gradient scrim */}
            <div
              className="absolute inset-0 z-[1]"
              style={{
                background:
                  "linear-gradient(180deg, rgba(13,28,48,0) 30%, rgba(13,28,48,0.96) 62%)",
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
