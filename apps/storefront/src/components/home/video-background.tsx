/**
 * Home VideoBackground (T54) — clone ref: my-clone `src/components/VideoBackground.tsx`.
 *
 * Server component: the only "interactivity" is the native `<video>`
 * autoplay/loop/muted/playsInline attributes, which need no client JS, so no
 * "use client" boundary. Full-bleed background video with a dark scrim and a
 * centered heading/caption/CTA block, exactly as in the clone. One
 * deliberate deviation: the CTA uses the canonical shadcn `Button`
 * (`variant="default"`, the translated `.athens-btn`) instead of the clone's
 * raw `athens-btn` class on a bare `<Link>`, per the plan's "no raw
 * athens-btn* classes on app components" rule (same pattern already used in
 * `promo-tiles-row.tsx`). The section background also swaps the clone's raw
 * `bg-[#287DFF]` fallback for the equivalent `--color-athens-blue-light`
 * token (globals.css calls this shade out by name for exactly this use:
 * "secondary blue ... video band").
 *
 * Data comes from `videoBackground` in `@/config/home`
 * (`VideoBackgroundConfig`, see `@/config/types` —
 * `{ video, heading, caption, ctaLabel, href }`); the video file lives under
 * `/public/marketing/videos/`.
 */

import Link from "next/link"

import { Button } from "@/components/ui/button"
import { videoBackground } from "@/config/home"

export function VideoBackground() {
  return (
    <section className="relative h-[520px] w-full overflow-hidden bg-[var(--color-athens-blue-light)] min-[750px]:h-[700px]">
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src={videoBackground.video}
        autoPlay
        loop
        muted
        playsInline
      />
      <div className="absolute inset-0 bg-black/35" aria-hidden="true" />
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-5 text-center">
        <h2 className="mb-3 text-[26px] font-medium text-white min-[750px]:text-[34px]">
          {videoBackground.heading}
        </h2>
        <p className="mb-6 text-[15px] text-white/90">{videoBackground.caption}</p>
        <Button render={<Link href={videoBackground.href} />}>
          {videoBackground.ctaLabel}
        </Button>
      </div>
    </section>
  )
}
