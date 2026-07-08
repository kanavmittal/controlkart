/**
 * Home ScrollingMarquee (T52) — clone ref: my-clone `src/components/ScrollingMarquee.tsx`.
 *
 * Infinite CSS marquee: two duplicated item groups sit side by side in a
 * flex row, each animated with `animate-[scrolling-elements_30s_linear_infinite]`
 * — the `@keyframes scrolling-elements` (translateX(0) -> translateX(-100%))
 * defined in `src/app/globals.css` (T2). As the first group scrolls fully
 * out of view, the second, identical group has scrolled into exactly the
 * position the first started at, producing a seamless loop. Pure CSS
 * animation, so this stays a server component (no client JS needed).
 *
 * The clone hardcodes "Deal of the day" x 12 with a fixed icon; ours reads
 * `marquee` (`string[]`) from `@/config/home` and repeats the list to fill
 * the track at a comparable density. The clone's custom `CirclePercentageIcon`
 * is swapped for lucide's `BadgePercent`. The second group is `aria-hidden`
 * (visual duplicate only) so screen readers announce the marquee text once.
 */

import { BadgePercent } from "lucide-react";

import { marquee } from "@/config/home";

const REPEAT = 3;

function MarqueeGroup({ hidden }: { hidden?: boolean }) {
  return (
    <div
      aria-hidden={hidden ? true : undefined}
      className="flex shrink-0 animate-[scrolling-elements_30s_linear_infinite]"
    >
      {Array.from({ length: REPEAT }).map((_, repeatIndex) =>
        marquee.map((label, index) => (
          <div key={`${repeatIndex}-${index}`} className="flex items-center gap-[10px] pr-10">
            <BadgePercent className="h-6 w-6 shrink-0 text-white" />
            <span className="whitespace-nowrap text-[16px] leading-[25.6px] text-white">
              {label}
            </span>
          </div>
        ))
      )}
    </div>
  );
}

export function ScrollingMarquee() {
  return (
    <section className="w-full overflow-hidden bg-[#004FC7] py-[14px]">
      <div className="flex">
        <MarqueeGroup />
        <MarqueeGroup hidden />
      </div>
    </section>
  );
}
