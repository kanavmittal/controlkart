"use client";

/**
 * Home CountdownBanner (T50) — clone ref: my-clone `src/components/CountdownBanner.tsx`.
 *
 * Full-width promo banner (bg image + dark gradient overlay, heading/caption/
 * CTA) with a live digit-tile countdown (Days/Hours/Minutes/Seconds) ticking
 * down to `countdownBanner.targetDate`. The clone stores a raw epoch-seconds
 * field; ours reads an ISO-8601 string per `CountdownBannerConfig`
 * (`@/config/types`), so `getRemaining` diffs `Date` instances instead.
 *
 * `useCountdown` is an inline ~15-line hook (per plan "Countdown lib: No").
 * SSR-safety: the hook's `mounted` flag stays `false` until the first
 * `useEffect` runs on the client, so both the server render and the initial
 * client render show the same "00" placeholder tiles — the real remaining
 * time (and the expired check, which depends on wall-clock time and would
 * otherwise disagree between server and client) only ever appears after
 * mount, avoiding a hydration mismatch. When the target date has passed,
 * the component renders null (no "deal ended" state, matching the clone).
 */

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { countdownBanner } from "@/config/home";

const UNIT_LABELS = ["Days", "Hours", "Minutes", "Seconds"] as const;
type UnitLabel = (typeof UNIT_LABELS)[number];
type Remaining = Record<UnitLabel, number>;

const ZERO_REMAINING: Remaining = { Days: 0, Hours: 0, Minutes: 0, Seconds: 0 };

function getRemaining(targetDate: string): Remaining {
  const diff = Math.max(0, Math.floor((new Date(targetDate).getTime() - Date.now()) / 1000));
  return {
    Days: Math.floor(diff / 86400),
    Hours: Math.floor((diff % 86400) / 3600),
    Minutes: Math.floor((diff % 3600) / 60),
    Seconds: diff % 60,
  };
}

function useCountdown(targetDate: string) {
  const [remaining, setRemaining] = useState<Remaining>(ZERO_REMAINING);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const tick = () => setRemaining(getRemaining(targetDate));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  const expired = mounted && new Date(targetDate).getTime() <= Date.now();

  return { remaining, mounted, expired };
}

export function CountdownBanner() {
  const { remaining, mounted, expired } = useCountdown(countdownBanner.targetDate);

  if (expired) return null;

  return (
    <section className="athens-container mt-5 mb-[60px]">
      <div className="relative overflow-hidden rounded-[5px] bg-[#232323] min-[750px]:h-[134px]">
        <Image
          src={countdownBanner.image}
          alt=""
          fill
          sizes="(max-width: 1400px) 100vw, 1400px"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(128deg,rgba(0,0,0,0.07),rgba(0,0,0,0.69)_99%)]" />
        <div className="relative z-10 flex h-full flex-col gap-6 px-5 py-6 min-[750px]:flex-row min-[750px]:items-center min-[750px]:justify-between min-[750px]:px-10 min-[750px]:py-0">
          <div>
            <div className="flex items-baseline gap-6">
              <h2 className="text-2xl font-medium text-white">{countdownBanner.heading}</h2>
              <Link
                href={countdownBanner.href}
                className="text-[15px] text-white underline underline-offset-4 hover:no-underline"
              >
                {countdownBanner.ctaLabel}
              </Link>
            </div>
            <p className="mt-1.5 text-[15px] text-white/85">{countdownBanner.caption}</p>
          </div>
          <div className="flex flex-wrap gap-[18px]">
            {UNIT_LABELS.map((label) => (
              <div key={label}>
                <div className="flex gap-[4px]">
                  {String(mounted ? remaining[label] : 0)
                    .padStart(2, "0")
                    .split("")
                    .map((digit, index) => (
                      <span
                        key={index}
                        className="flex h-9 w-[27px] items-center justify-center rounded-[3px] bg-white text-[20px] font-medium text-[#232323]"
                      >
                        {digit}
                      </span>
                    ))}
                </div>
                <div className="mt-1.5 text-center text-xs text-white/75">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
