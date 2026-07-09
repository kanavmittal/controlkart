"use client";

/**
 * Home HeroSlideshow (T43) — clone ref: my-clone `src/components/HeroSlideshow.tsx`.
 *
 * Reproduces the clone's look (full-width slide, dark gradient overlay,
 * heading/caption/CTA copy block, prev/next chevrons + dot indicators
 * bottom-center) but is implemented on the shadcn `ui/carousel` primitive
 * (Embla-based) instead of the clone's hand-rolled `translateX` track, per
 * plan T43 + the "Embla via shadcn carousel" library decision. No autoplay
 * (the clone has none — plugin intentionally omitted).
 *
 * Data comes from `heroSlides` in `@/config/home` (`HeroSlide[]`, see
 * `@/config/types` — `{ heading, caption, ctaLabel, href, image }`).
 */

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { heroSlides } from "@/config/home";

export function HeroSlideshow() {
  const [api, setApi] = React.useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  React.useEffect(() => {
    if (!api) return;

    const onSelect = () => setSelectedIndex(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);

    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api]);

  return (
    <Carousel
      setApi={setApi}
      opts={{ loop: true }}
      className="relative h-[420px] overflow-hidden min-[750px]:h-[480px]"
    >
      <CarouselContent className="ml-0 h-[420px] min-[750px]:h-[480px]">
        {heroSlides.map((slide, i) => (
          <CarouselItem key={slide.heading} className="relative h-full basis-full pl-0">
            <Image
              src={slide.image}
              alt={slide.heading}
              fill
              priority={i === 0}
              sizes="100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(265deg,rgba(0,0,0,0)_3%,rgba(0,0,0,0.8)_100%)]" />
            <div className="athens-container relative flex h-full flex-col justify-center">
              <div className="max-w-[560px]">
                <h2 className="mb-3 text-[28px] font-medium leading-[1.2] tracking-[-0.01em] text-white min-[750px]:text-[40px]">
                  {slide.heading}
                </h2>
                <p className="mb-6 text-[15px] leading-[24px] text-white/90">
                  {slide.caption}
                </p>
                <Button render={<Link href={slide.href} />}>
                  {slide.ctaLabel}
                </Button>
              </div>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>

      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3">
        <button
          type="button"
          aria-label="Previous slide"
          onClick={() => api?.scrollPrev()}
          className="bg-transparent text-white transition-opacity hover:opacity-70"
        >
          <ChevronLeft width={20} height={20} strokeWidth={2.5} />
        </button>
        {heroSlides.map((slide, i) => (
          <button
            key={slide.heading}
            type="button"
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => api?.scrollTo(i)}
            className={cn(
              "size-[8px] rounded-full transition-colors duration-200",
              i === selectedIndex ? "bg-white" : "bg-[rgba(255,255,255,0.45)]"
            )}
          />
        ))}
        <button
          type="button"
          aria-label="Next slide"
          onClick={() => api?.scrollNext()}
          className="bg-transparent text-white transition-opacity hover:opacity-70"
        >
          <ChevronRight width={20} height={20} strokeWidth={2.5} />
        </button>
      </div>
    </Carousel>
  );
}
