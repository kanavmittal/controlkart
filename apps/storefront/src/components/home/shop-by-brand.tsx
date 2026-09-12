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
import { listBrands } from "@/lib/data/brands"

export async function ShopByBrand() {
  const brands = await listBrands().catch(() => []);
  if (!brands.length) return null;
  return (
    <section className="athens-container my-10 md:my-[60px]">
      <Carousel>
        <SectionHeading title="Shop by brand" actionLabel="View all" actionHref="/brands">
          {brands.length > 6 ? <div className="flex items-center gap-2">
            <CarouselPrevious className="static translate-x-0 translate-y-0" />
            <CarouselNext className="static translate-x-0 translate-y-0" />
          </div> : null}
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
                {brand.logo_url ? <Image
                  src={brand.logo_url}
                  alt={brand.name}
                  width={280}
                  height={90}
                  className="h-full w-full object-contain"
                /> : <span className="font-semibold">{brand.name}</span>}
              </Link>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </section>
  )
}
