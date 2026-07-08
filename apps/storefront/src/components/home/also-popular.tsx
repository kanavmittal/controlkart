/**
 * Home AlsoPopular (T49) — clone ref: my-clone `src/components/AlsoPopular.tsx`.
 *
 * Grid of category link chips (image thumbnail + title + trailing chevron):
 * 1 col mobile / 3 cols tablet / 5 cols desktop. Server component — no
 * client state.
 *
 * Data comes from `alsoPopular` in `@/config/home` (`CategoryChip[]`, see
 * `@/config/types` — `{ title, href, image }`). Like `popularCategories`,
 * the ControlKart config exports a flat chip array with no section
 * heading/action metadata, so the heading copy below is ported from the
 * clone directly (`/collections` rewritten to `/categories` per the route
 * strategy). The clone's custom `ChevronRightThickIcon` is swapped for
 * lucide's `ChevronRight` per plan T49.
 */

import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { SectionHeading } from "@/components/shared/section-heading";
import { alsoPopular } from "@/config/home";

// "Also popular" category links grid.
export function AlsoPopular() {
  return (
    <section className="athens-container my-[60px]">
      <SectionHeading title="Also popular" actionLabel="All categories" actionHref="/categories" />
      <div className="grid grid-cols-1 gap-x-5 gap-y-[15px] md:grid-cols-3 lg:grid-cols-5">
        {alsoPopular.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex h-14 items-center overflow-hidden rounded-[5px] bg-white shadow-[inset_0_0_0_1px_#dfdfdf] transition-shadow duration-200 hover:shadow-[inset_0_0_0_1px_#232323] md:h-[62px]"
          >
            <Image
              src={item.image}
              alt={item.title}
              width={72}
              height={72}
              loading="lazy"
              sizes="(max-width: 767px) 56px, 62px"
              className="size-14 shrink-0 object-cover md:size-[62px]"
            />
            <span className="flex-1 px-4 text-[15px] leading-tight text-[#232323]">
              {item.title}
            </span>
            <ChevronRight className="mr-4 size-4 shrink-0 text-[#676767]" aria-hidden />
          </Link>
        ))}
      </div>
    </section>
  );
}
