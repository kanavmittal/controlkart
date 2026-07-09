import Image from "next/image"
import Link from "next/link"

import { SectionHeading } from "@/components/shared/section-heading"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { brands } from "@/config/brands"

/**
 * Home ShopByBrand (T48) — clone ref: my-clone `src/components/ShopByBrand.tsx`.
 *
 * Brand-logo carousel: bordered white tiles linking to each brand's `href`
 * (currently all `/brands`), built on the shadcn `ui/carousel` primitive
 * (Embla-based) per the "Embla via shadcn carousel" library decision,
 * replacing the clone's hand-rolled `Carousel`/`CarouselArrows`. Prev/next
 * arrows sit inline in the heading row (via `SectionHeading`'s `children`
 * slot, rendered before the action link) to match the clone's placement,
 * instead of shadcn's default floating-outside-the-track position.
 *
 * Slide widths reproduce the clone's fractional-view math (~1 slide visible
 * on mobile, 4 on `md`, 6 on `lg`) via arbitrary `basis-[...]` values,
 * translated from the clone's width+gap formula to the shadcn item's
 * basis/padding gap convention (clone `gap-5` -> `-ml-5` on
 * `CarouselContent` / `pl-5` on `CarouselItem`).
 *
 * Data comes from `brands` in `@/config/brands` (`BrandConfig[]`, see
 * `@/config/types` — `{ name, logo, href }`).
 *
 * No client hooks are used directly here, so no "use client" directive —
 * `ui/carousel`'s pieces (`Carousel`, `CarouselContent`, `CarouselItem`,
 * `CarouselPrevious`, `CarouselNext`) are already client components
 * (`carousel.tsx` has its own top-of-file "use client"), and this component
 * only composes them declaratively (cf. `products/[handle]/page.tsx`'s
 * `SectionHeading` usage, a server component).
 */
export function ShopByBrand() {
  return (
    <section className="athens-container my-[60px]">
      <Carousel>
        <SectionHeading title="Shop by brand" actionLabel="View all" actionHref="/brands">
          <div className="flex items-center gap-2">
            <CarouselPrevious className="static translate-x-0 translate-y-0" />
            <CarouselNext className="static translate-x-0 translate-y-0" />
          </div>
        </SectionHeading>
        <CarouselContent className="-ml-5">
          {brands.map((brand) => (
            <CarouselItem
              key={brand.name}
              className="basis-[88%] pl-5 md:basis-[calc((100%-60px)/4)] lg:basis-[calc((100%-100px)/6)]"
            >
              <Link
                href={brand.href}
                aria-label={brand.name}
                className="flex h-[120px] w-full items-center justify-center rounded-[5px] bg-white p-[10px] shadow-[inset_0_0_0_1px_#dfdfdf] transition-shadow duration-200 hover:shadow-[inset_0_0_0_1px_#232323]"
              >
                <Image
                  src={brand.logo}
                  alt={brand.name}
                  width={280}
                  height={90}
                  className="h-full w-full object-contain"
                />
              </Link>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </section>
  )
}
