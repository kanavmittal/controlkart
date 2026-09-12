/**
 * Home PopularCategories (T47) — clone ref: my-clone `src/components/PopularCategories.tsx`.
 *
 * Asymmetric two-row mosaic of category tiles: row 1 is `2fr 1fr 1fr`
 * (wide tile first), row 2 is `1fr 1fr 2fr` (wide tile last), collapsing to
 * a horizontal snap-scroll row below the `750px` breakpoint and a 2-col
 * grid between `750px`–`990px`. Each tile has a hover-zoom image, bottom
 * gradient, title, and either a blue flag badge (discount/"New") or a
 * plain blue notch when no flag is set. Server component — no client state.
 *
 * Data comes from `popularCategories` in `@/config/home`
 * (`PopularCategoryTile[]`, see `@/config/types` —
 * `{ title, href, image, wide?, flag? }`). Unlike the clone's
 * `data/sections.ts` shape, the ControlKart config exports a flat tile
 * array with no section heading/action metadata, so the heading copy below
 * is ported from the clone directly (`/collections` rewritten to
 * `/categories` per the route strategy).
 */

import { getCategoryBadges } from "@/lib/data/category-badges";
import { ProductBadges, type ProductBadge } from "@/components/shared/product-badges";
import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { SectionHeading } from "@/components/shared/section-heading";
import { popularCategories } from "@/config/home";
import type { PopularCategoryTile } from "@/config/types";

// Single mosaic tile: image with hover zoom, bottom gradient, title, top-left flag/notch.
function CategoryTileCard({ tile, badges }: { tile: PopularCategoryTile; badges: ProductBadge[] }) {
  return (
    <Link
      href={tile.href}
      className={cn(
        "group relative block overflow-hidden rounded-[5px] h-[340px] w-[85%] shrink-0 snap-start min-[750px]:w-auto min-[750px]:shrink",
        tile.wide && "min-[750px]:col-span-2 min-[990px]:col-span-1"
      )}
    >
      <Image
        src={tile.image}
        alt={tile.title}
        fill
        loading="lazy"
        sizes="(max-width: 749px) 100vw, (max-width: 989px) 50vw, 33vw"
        className="bg-[#f5f6f7] object-contain pb-24 pt-6 px-5 transition-transform duration-[400ms] group-hover:scale-[1.04]"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_55%,rgba(0,0,0,0.7)_100%)]"
      />
      <ProductBadges badges={badges} className="absolute left-[30px] right-[30px] top-4" />
      <span className="absolute bottom-0 left-0 p-[30px] text-[24px] font-medium text-white">
        {tile.title}
      </span>
    </Link>
  );
}

// "Popular categories" mosaic: two asymmetric grid rows of category tiles.
export async function PopularCategories() {
  const badges = await getCategoryBadges();
  const rowOne = popularCategories.slice(0, 3);
  const rowTwo = popularCategories.slice(3, 6);

  return (
    <section className="athens-container my-[60px]">
      <SectionHeading title="Popular categories" actionLabel="All categories" actionHref="/categories" />
      <div className="grid gap-5">
        <div className="flex gap-5 overflow-x-auto snap-x snap-mandatory athens-no-scrollbar min-[750px]:grid min-[750px]:grid-cols-2 min-[750px]:overflow-visible min-[990px]:grid-cols-[2fr_1fr_1fr]">
          {rowOne.map((tile) => (
            <CategoryTileCard key={tile.title} tile={tile} badges={badges[tile.href] ?? []} />
          ))}
        </div>
        <div className="mt-5 flex gap-5 overflow-x-auto snap-x snap-mandatory athens-no-scrollbar min-[750px]:mt-5 min-[750px]:grid min-[750px]:grid-cols-2 min-[750px]:overflow-visible min-[990px]:grid-cols-[1fr_1fr_2fr]">
          {rowTwo.map((tile) => (
            <CategoryTileCard key={tile.title} tile={tile} badges={badges[tile.href] ?? []} />
          ))}
        </div>
      </div>
    </section>
  );
}
