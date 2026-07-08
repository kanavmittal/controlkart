/**
 * Home PromoTilesRow (T44) — clone ref: my-clone `src/components/PromoTilesRow.tsx`.
 *
 * Server component: no interactivity here (the row is a static 3-tile grid
 * of links/CTAs), so it renders straight from `promoTiles` in `@/config/home`
 * with no "use client" boundary. Reproduces the clone's layout (horizontal
 * snap-scroll on mobile, 2/3-col grid from 750px/990px, dark bottom gradient,
 * top-left flag badge or plain accent bar, bottom-anchored copy block) with
 * one deliberate deviation: the CTA uses the canonical shadcn `Button`
 * (`variant="default"`, i.e. the translated `.athens-btn`) instead of the
 * clone's raw `athens-btn` class on a bare `<Link>`, per the plan's rule that
 * `.athens-btn*` classes are never recreated as raw utilities/classes on app
 * components.
 *
 * Each tile is image OR video background (`PromoTile.image` / `.video` in
 * `@/config/types`); video tiles autoplay muted + looped, matching the clone.
 */

import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { promoTiles } from "@/config/home";

export function PromoTilesRow() {
  // Sits on the same #f8f8f8 band as the deals section below (30px top
  // padding, no bottom gap) — matches the clone's section wrapper exactly.
  return (
    <section className="bg-[#f8f8f8] pt-[30px]">
      <div className="athens-container">
        <div className="flex gap-5 overflow-x-auto snap-x snap-mandatory athens-no-scrollbar min-[750px]:grid min-[750px]:grid-cols-2 min-[750px]:overflow-visible min-[990px]:grid-cols-3">
          {promoTiles.map((tile) => (
            <div
              key={tile.title}
              className="relative h-[420px] w-[85%] shrink-0 snap-start overflow-hidden rounded-[5px] min-[750px]:h-[460px] min-[750px]:w-auto min-[750px]:shrink"
            >
              {tile.video ? (
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  src={tile.video}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : tile.image ? (
                <Image
                  src={tile.image}
                  alt={tile.title}
                  fill
                  sizes="(max-width: 749px) 100vw, (max-width: 989px) 50vw, 33vw"
                  className="object-cover"
                />
              ) : null}
              <div
                aria-hidden
                className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_40%,rgba(0,0,0,0.75)_100%)]"
              />
              {tile.flag ? (
                <div className="absolute left-[30px] top-0 rounded-b-[2px] bg-[#004FC7] px-4 py-2.5 text-center text-white">
                  <span className="block text-[13px] leading-[1.3]">
                    {tile.flag.top}
                  </span>
                  <span className="block text-[15px] font-medium leading-[1.3]">
                    {tile.flag.bottom}
                  </span>
                </div>
              ) : (
                <div className="absolute left-[30px] top-0 h-2 w-[42px] bg-[#004FC7]" />
              )}
              <div className="absolute bottom-0 left-0 right-0 p-[30px]">
                <h3 className="mb-2 text-[24px] font-medium leading-[1.3] text-white">
                  {tile.title}
                </h3>
                {tile.caption ? (
                  <p className="mb-5 max-w-[340px] text-[15px] leading-[24px] text-white/90">
                    {tile.caption}
                  </p>
                ) : null}
                <Button render={<Link href={tile.href} />}>
                  {tile.ctaLabel}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
