"use client"

/**
 * Home SlidingPanels (T56) — clone ref: my-clone `src/components/SlidingPanels.tsx`.
 *
 * Client component: a row of image panels where exactly one is always
 * "expanded" — click/keyboard-select any panel to expand it, collapsing the
 * rest. Desktop animates each panel's `flex-grow`/`flex-basis` (all five
 * stay mounted, side by side, same height); mobile animates `height`
 * (panels stack vertically). Collapsed panels show a vertical (rotated)
 * title; the expanded panel shows a gradient scrim + heading/caption/CTA.
 *
 * Ported the clone's hand-rolled `useState` + `role="button"` interaction
 * byte-for-byte (functionally) rather than shadcn/Base UI `Accordion`,
 * deliberately:
 *   - All five panels stay permanently mounted and visible at once, just
 *     resized — Base UI Accordion is built around a single content region
 *     collapsing/hiding (`hidden` + height-to-0), not five sibling panels
 *     redistributing `flex-grow`/`flex-basis` while each keeps rendering a
 *     (rotated) label.
 *   - There's always exactly one expanded panel and never zero — this isn't
 *     open/closed disclosure content, it's a "which panel is focused"
 *     selection, so a plain `expandedIndex` number is simpler and more
 *     honest than fitting it into Accordion's `value`/multi-item model.
 *   - The desktop transition targets `flex-grow`/`flex-basis` on the
 *     container's direct children (a coverflow-style image strip), which
 *     isn't an animation Accordion's content-height primitive expresses.
 *   - Accessibility is handled directly (`role="button"`, `tabIndex`,
 *     `aria-expanded`, Enter/Space activation) rather than needed via
 *     Accordion's trigger/panel wiring, since there's no collapsible
 *     "content" being hidden from the accessibility tree — just a resize.
 *
 * One deliberate deviation from the clone: the CTA uses the canonical
 * shadcn `Button` (`variant="default"`, the translated `.athens-btn`)
 * instead of the clone's raw `athens-btn` class on a bare `<Link>`, per the
 * plan's "no raw athens-btn* classes on app components" rule. The CTA still
 * calls `stopPropagation()` (now via the rendered `<Link>`'s own `onClick`)
 * so clicking it doesn't also re-trigger the panel's own click handler, and
 * still gets `tabIndex={-1}` while collapsed so it isn't keyboard-reachable
 * until its panel is expanded.
 *
 * Data comes from `slidingPanels` in `@/config/home` (`SlidingPanel[]`, see
 * `@/config/types` — `{ title, caption, ctaLabel, href, image }`).
 */

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { slidingPanels } from "@/config/home"
import { cn } from "@/lib/utils"

export function SlidingPanels() {
  const [expandedIndex, setExpandedIndex] = useState(0)

  return (
    <section className="athens-container my-[60px]">
      <div className="flex flex-col gap-[10px] max-[749px]:h-auto min-[750px]:h-[400px] min-[750px]:flex-row">
        {slidingPanels.map((panel, index) => {
          const expanded = index === expandedIndex
          return (
            <div
              key={panel.title}
              role="button"
              tabIndex={0}
              aria-expanded={expanded}
              onClick={() => setExpandedIndex(index)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  setExpandedIndex(index)
                }
              }}
              className={cn(
                "relative cursor-pointer overflow-hidden rounded-[5px]",
                "max-[749px]:transition-[height] max-[749px]:duration-500 max-[749px]:ease-[cubic-bezier(0.4,0,0.2,1)]",
                expanded
                  ? "max-[749px]:h-[320px] min-[750px]:grow min-[750px]:basis-0"
                  : "max-[749px]:h-[64px] min-[750px]:grow-[0.001] min-[750px]:basis-[90px]",
                "min-[750px]:h-full min-[750px]:transition-[flex-grow,flex-basis] min-[750px]:duration-500 min-[750px]:ease-[cubic-bezier(0.4,0,0.2,1)]"
              )}
            >
              <Image
                src={panel.image}
                alt={panel.title}
                fill
                sizes="(max-width: 749px) 100vw, 1400px"
                className="object-cover"
              />

              {/* Collapsed state: dark overlay + vertical title */}
              <div
                aria-hidden={expanded}
                className={cn(
                  "absolute inset-0 flex items-center justify-center bg-black/35",
                  "transition-opacity duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] delay-100",
                  expanded ? "pointer-events-none opacity-0" : "opacity-100"
                )}
              >
                <span className="text-[20px] leading-[32px] font-semibold text-white min-[750px]:rotate-180 min-[750px]:[writing-mode:vertical-rl]">
                  {panel.title}
                </span>
              </div>

              {/* Expanded state: gradient overlay + content */}
              <div
                aria-hidden={!expanded}
                className={cn(
                  "absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.65)_0%,rgba(0,0,0,0.15)_60%)]",
                  "transition-opacity duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] delay-100",
                  expanded ? "opacity-100" : "pointer-events-none opacity-0"
                )}
              >
                <div className="absolute inset-y-0 left-0 flex max-w-[460px] flex-col items-start justify-center p-[50px] max-[749px]:p-6">
                  <h2 className="mb-3 text-[32px] leading-tight font-medium text-white">
                    {panel.title}
                  </h2>
                  <p className="mb-5 text-[15px] text-white/90">{panel.caption}</p>
                  <Button
                    tabIndex={expanded ? 0 : -1}
                    render={
                      <Link
                        href={panel.href}
                        onClick={(event) => event.stopPropagation()}
                      />
                    }
                  >
                    {panel.ctaLabel}
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
