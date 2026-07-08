/**
 * Home ProductLists (T55) — clone ref: my-clone `src/components/ProductLists.tsx`
 * ("Popular woodworking tools"): 3 columns, each a banner image card on top +
 * up to 5 compact product rows below (small thumbnail, 2-line title, price,
 * optional sale badge).
 *
 * `columns[].banner` matches `ProductListColumnConfig["banner"]` in
 * `@/config/types` (`{ title, image, href }` — no `caption`, unlike the
 * clone's `ProductListColumn.banner.caption`; the config doesn't carry one,
 * so the banner overlay renders title only). `columns[].products` are live
 * `HttpTypes.StoreProduct[]` — like `FeaturedCollection`/`DealsTabs`, this
 * component takes resolved products rather than reading `@/config/home`
 * directly; the caller (home page, wired separately) resolves each column's
 * `handles` to products via `lib/data/products.ts` and passes them down.
 *
 * A column with no products still renders its banner (just no row list
 * below it). The whole section renders `null` when every column is empty.
 * Server-renderable — no client state.
 *
 * Mounted by app/page.tsx after VideoBackground, per clone section order.
 */

import Image from "next/image"
import Link from "next/link"
import type { HttpTypes } from "@medusajs/types"

import { SectionHeading } from "@/components/shared/section-heading"
import { Price } from "@/components/shared/price"
import { ProductBadges, deriveProductBadges } from "@/components/shared/product-badges"

export interface ProductListColumnData {
  banner: { title: string; image: string; href: string }
  products: HttpTypes.StoreProduct[]
}

export interface ProductListsProps {
  columns: ProductListColumnData[]
}

// Compact row: small thumb, 2-line-clamp title, compact price, sale badge.
// Price/discount derivation ported from `product/product-card.tsx` (cheapest
// calculated price across variants; "From " when variants disagree on price).
function CompactProductRow({ product }: { product: HttpTypes.StoreProduct }) {
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

  // Reuse the shared sale/new/sold-out deriver, filtered to sale only — this
  // row has no room for the full badge set.
  const saleBadges = deriveProductBadges(product).filter(
    (badge) => badge.variant === "sale"
  )

  const href = `/products/${product.handle}`

  return (
    <Link href={href} className="group flex items-start gap-3">
      <span className="relative size-16 shrink-0 overflow-hidden rounded-[5px] bg-[var(--color-athens-band)] md:size-[72px]">
        {product.thumbnail ? (
          <Image
            src={product.thumbnail}
            alt={product.title}
            fill
            sizes="72px"
            className="object-cover"
          />
        ) : null}
        <ProductBadges badges={saleBadges} className="absolute top-1 left-1" />
      </span>
      <span className="flex min-w-0 flex-col gap-1 pt-0.5">
        <span className="line-clamp-2 text-[14px] leading-[18px] text-[var(--color-athens-dark)] group-hover:underline">
          {product.title}
        </span>
        <Price
          amount={cheapestPrice?.calculated_amount ?? null}
          originalAmount={cheapestPrice?.original_amount ?? null}
          from={priceFrom}
          className="text-sm"
        />
      </span>
    </Link>
  )
}

// "Popular picks" — 3-col grid (stacks to 1 col on mobile, 2 on tablet),
// each column a banner card + up to 5 compact product rows.
export function ProductLists({ columns }: ProductListsProps) {
  const hasAnyProducts = columns.some((column) => column.products.length > 0)
  if (!hasAnyProducts) return null

  return (
    <section className="athens-container my-[60px]">
      <SectionHeading title="Popular picks" />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {columns.map((column) => (
          <div key={column.banner.href}>
            <Link
              href={column.banner.href}
              className="relative mb-[30px] block h-[110px] overflow-hidden rounded-[5px]"
            >
              {column.banner.image ? (
                <Image
                  src={column.banner.image}
                  alt={column.banner.title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover"
                />
              ) : null}
              <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0),rgba(0,0,0,0.8)_100%)]" />
              <span className="absolute top-0 left-5 z-[2] h-[8px] w-[42px] bg-[#004FC7]" />
              <span className="absolute bottom-0 left-0 z-[2] p-5">
                <span className="text-[20px] font-semibold text-white">
                  {column.banner.title}
                </span>
              </span>
            </Link>

            {column.products.length > 0 ? (
              <div className="flex flex-col gap-5">
                {column.products.map((product) => (
                  <CompactProductRow key={product.id} product={product} />
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  )
}
