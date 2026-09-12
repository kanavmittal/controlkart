"use client";

import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { heroSlides } from "@/config/home";

export function HeroSlideshow() {
  return (
    <Carousel
      opts={{ watchDrag: false }}
      className="relative h-[520px] overflow-hidden min-[750px]:h-[480px]"
    >
      <CarouselContent className="ml-0 h-[520px] min-[750px]:h-[480px]">
        {heroSlides.slice(0, 1).map((slide, i) => (
          <CarouselItem key={slide.heading} className="relative h-full basis-full bg-[#070f20] pl-0">
            <Image
              src={slide.image}
              alt={slide.heading}
              fill
              priority={i === 0}
              sizes="100vw"
              className="!top-auto !h-[250px] object-cover object-right min-[750px]:!top-0 min-[750px]:!h-full min-[750px]:object-center"
            />
            <div className="absolute inset-0 bg-[linear-gradient(265deg,rgba(0,0,0,0)_3%,rgba(0,0,0,0.8)_100%)]" />
            <div className="athens-container relative flex h-full flex-col justify-start pt-8 min-[750px]:justify-center min-[750px]:pt-0">
              <div className="max-w-[560px]">
                <h1 className="mb-3 text-[28px] font-medium leading-[1.2] tracking-[-0.01em] text-white min-[750px]:text-[40px]">
                  {slide.heading}
                </h1>
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

    </Carousel>
  );
}
