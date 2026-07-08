/**
 * Home MediaWithText (T54) — clone ref: my-clone `src/components/MediaWithText.tsx`.
 *
 * Server component: a static image + heading/caption/CTA split card, no
 * interactivity, so no "use client" boundary. Reproduces the clone's layout
 * (rounded card with an inset hairline border, image right / copy left on
 * desktop, image stacked on top on mobile) exactly. One deliberate
 * deviation: the CTA uses the canonical shadcn `Button` (`variant="default"`,
 * the translated `.athens-btn`) instead of the clone's raw `athens-btn`
 * class on a bare `<Link>`, per the plan's "no raw athens-btn* classes on
 * app components" rule (same pattern already used in `promo-tiles-row.tsx`
 * and `video-background.tsx`). The card border and heading/caption text
 * colors swap the clone's raw hex for the equivalent `--color-athens-line`
 * / `--color-athens-dark` / `--color-athens-body` tokens.
 *
 * Data comes from `mediaWithText` in `@/config/home`
 * (`MediaWithTextConfig`, see `@/config/types` —
 * `{ image, heading, caption, ctaLabel, href }`).
 */

import Image from "next/image"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { mediaWithText } from "@/config/home"

export function MediaWithText() {
  return (
    <section className="athens-container my-[60px]">
      <div className="grid min-h-[429px] grid-cols-1 overflow-hidden rounded-[5px] bg-white p-3 shadow-[inset_0_0_0_1px_var(--color-athens-line)] min-[750px]:grid-cols-2">
        <div className="relative order-1 h-[240px] overflow-hidden rounded-[5px] min-[750px]:order-2 min-[750px]:h-auto min-[750px]:min-h-[403px]">
          <Image
            src={mediaWithText.image}
            alt={mediaWithText.heading}
            fill
            sizes="(max-width: 749px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
        <div className="order-2 flex flex-col justify-center p-6 min-[750px]:order-1 min-[750px]:py-0 min-[750px]:pl-20 min-[750px]:pr-14">
          <h2 className="mb-4 text-[28px] font-medium leading-[1.3] text-[var(--color-athens-dark)]">
            {mediaWithText.heading}
          </h2>
          <p className="mb-6 max-w-[560px] text-[15px] leading-6 text-[var(--color-athens-body)]">
            {mediaWithText.caption}
          </p>
          <Button className="self-start" render={<Link href={mediaWithText.href} />}>
            {mediaWithText.ctaLabel}
          </Button>
        </div>
      </div>
    </section>
  )
}
