/**
 * Home SimpleCollectionList (T56) — clone ref: my-clone `src/components/SimpleCollectionList.tsx`.
 *
 * Server component: a row of square image tiles with a label below
 * ("You might also need" on ControlKart, same as the clone) — no
 * interactivity, so no "use client" boundary.
 *
 * Data comes from `simpleCollections` in `@/config/home`. NOTE: unlike the
 * clone's `src/data/sections.ts` (`{ heading, items: CategoryChip[] }`),
 * ControlKart's config exports `simpleCollections` as a bare
 * `CategoryChip[]` (see `@/config/types`) — T5 already landed it that way
 * and this task's scope is the five component files only, so the section
 * heading is kept as the literal string here rather than adding a heading
 * field to the config.
 */

import { getCategoryBadges } from "@/lib/data/category-badges"
import { ProductBadges } from "@/components/shared/product-badges"
import Image from "next/image"
import Link from "next/link"

import { SectionHeading } from "@/components/shared/section-heading"
import { simpleCollections } from "@/config/home"

const HEADING = "You might also need"

export async function SimpleCollectionList() {
  const badges = await getCategoryBadges()
  return (
    <section className="athens-container my-[60px]">
      <SectionHeading title={HEADING} />
      <div className="grid grid-cols-2 gap-5 md:grid-cols-4 lg:grid-cols-7">
        {simpleCollections.map((item) => (
          <Link key={item.title} href={item.href} className="group block">
            <div className="relative aspect-square overflow-hidden rounded-[5px]">
              <Image
                src={item.image}
                alt={item.title}
                fill
                sizes="(min-width: 1024px) 14vw, (min-width: 768px) 25vw, 50vw"
                className="object-contain bg-[#f5f6f7] p-1"
              />
            </div>
            <p className="mt-3 text-center text-[15px] text-[var(--color-athens-body)] group-hover:text-[var(--color-athens-dark)] group-hover:underline">
              {item.title}
            </p>
            <ProductBadges badges={badges[item.href] ?? []} className="mt-2 justify-center" />
          </Link>
        ))}
      </div>
    </section>
  )
}
