import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { Tags } from "lucide-react"

import { Breadcrumbs } from "@/components/shared/breadcrumbs"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"
import { brands } from "@/config/brands"

export const metadata: Metadata = {
  title: "Shop by Brand",
  description:
    "Browse Selec and the other industrial-automation brands ControlKart carries — PLCs, IO modules, displays, sensors and accessories by manufacturer.",
  alternates: { canonical: "/brands" },
}

/**
 * /brands index (NEW route, T58). Grid of brand logo cards, structured
 * after the clone's shop-by-brand page (`my-clone/src/app/pages/shop-by-brand/page.tsx`):
 * bordered card, logo media block, centered label below. Ported to the
 * card idiom already established by `app/categories/page.tsx` (border +
 * `--radius` token) rather than the clone's literal inset-shadow classes.
 *
 * Link strategy (plan "Brand links" decision): `brand` is a
 * `product.metadata.brand` string, not a facet/collection endpoint, so
 * cards link to `/products?q=<brand name>` (the existing `?q=` search
 * seeding contract) rather than each config entry's own `href` field
 * (which today just points back at `/brands` as a placeholder — see
 * `config/brands.ts`).
 */
export default function BrandsPage() {
  return (
    <>
      <Breadcrumbs crumbs={[{ label: "Brands" }]} />
      <div className="athens-container py-10 md:py-14">
        <h1 className="athens-section-heading text-[28px]">Shop by Brand</h1>

        {brands.length === 0 ? (
          <Empty className="mt-8 border border-dashed border-athens-line">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Tags />
              </EmptyMedia>
              <EmptyTitle>No brands yet</EmptyTitle>
              <EmptyDescription>
                Check back soon, or browse the full catalog instead.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {brands.map((brand) => {
              const href = `/products?q=${encodeURIComponent(brand.name)}`

              return (
                <div key={brand.name}>
                  <Link
                    href={href}
                    className="group block overflow-hidden rounded-[var(--radius)] border border-border bg-white p-3 transition-colors hover:border-athens-dark"
                  >
                    <div className="relative aspect-[950/435] overflow-hidden rounded-[calc(var(--radius)-2px)] bg-athens-band">
                      <Image
                        src={brand.logo}
                        alt={brand.name}
                        fill
                        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                        className="object-cover"
                      />
                    </div>
                  </Link>
                  <p className="mt-3 text-center text-sm text-athens-body">
                    <Link href={href} className="hover:text-athens-dark hover:underline">
                      {brand.name}
                    </Link>
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
