"use client"

import { useState } from "react"
import type { HttpTypes } from "@medusajs/types"

import { SectionHeading } from "@/components/shared/section-heading"
import { ProductCard } from "@/components/product/product-card"
import { QuickViewButton } from "@/components/product/quick-view-button"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { cn } from "@/lib/utils"

export interface DealsTabsProps {
  tabs: {
    brandLabel: string
    products: HttpTypes.StoreProduct[]
  }[]
}

/**
 * "Deals of the week" grey band — brand-label pill tabs switch between
 * product carousels. Ported from `my-clone/src/components/DealsTabs.tsx`.
 * T57's server home page resolves `config/home.ts`'s `dealsTabs` (brand
 * label + product handles) into live products and passes them in as
 * `tabs` — this component does no fetching of its own.
 *
 * Tabs implementation: plain `useState` + a button list (clone's own
 * pattern: `aria-pressed`/`aria-label` pills), not the shadcn
 * `ui/tabs.tsx` primitives. The Athens pill (fixed-height white swatch,
 * ring-shadow active state) doesn't reuse shadcn's `TabsList`/
 * `TabsTrigger` look (bg-muted list track, rounded-md active background,
 * data-active bg/text swap) — overriding all of that per instance would
 * fight the defaults for no semantic gain over the clone's simpler
 * button-list, which this keeps. The panel fade-in on tab change is the
 * clone's CSS keyframe (`deals-tabs-fade-in`), re-keyed by the active tab
 * so it replays on every switch.
 *
 * Sale/new/sold-out styling comes free from `ProductCard`'s own badge
 * derivation — nothing deals-specific here. Tabs with no resolved
 * products are dropped; the section renders nothing if all are empty.
 */
export function DealsTabs({ tabs }: DealsTabsProps) {
  const visibleTabs = tabs.filter((tab) => tab.products.length > 0)
  const [activeIndex, setActiveIndex] = useState(0)
  const activeTab = visibleTabs[activeIndex] ?? visibleTabs[0]

  if (!activeTab) return null

  return (
    <section className="w-full bg-[var(--color-athens-band)] py-[58px]">
      <style>{`
        @keyframes deals-tabs-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
      <div className="athens-container">
        <SectionHeading title="Deals of the week" className="mb-[30px]">
          <div className="flex flex-wrap gap-[10px] max-[749px]:w-full">
            {visibleTabs.map((tab, index) => {
              const isActive = index === activeIndex
              return (
                <button
                  key={tab.brandLabel}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  aria-pressed={isActive}
                  aria-label={tab.brandLabel}
                  className={cn(
                    "h-11 cursor-pointer rounded-[var(--radius-button)] bg-white px-5 text-[15px] font-medium whitespace-nowrap text-[var(--color-athens-dark)] transition-[box-shadow] duration-300",
                    isActive
                      ? "text-primary shadow-[0_0_0_2px_var(--primary)]"
                      : "shadow-[0_0_0_1px_var(--border)]"
                  )}
                >
                  {tab.brandLabel}
                </button>
              )
            })}
          </div>
        </SectionHeading>

        <div
          key={activeTab.brandLabel}
          className="animate-[deals-tabs-fade-in_.3s_ease]"
        >
          <Carousel opts={{ align: "start" }} className="w-full">
            <CarouselContent>
              {activeTab.products.map((product) => (
                <CarouselItem
                  key={product.id}
                  className="basis-[92%] min-[750px]:basis-1/3 min-[990px]:basis-1/4"
                >
                  <ProductCard
                    product={product}
                    quickViewSlot={<QuickViewButton product={product} />}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden sm:flex" />
            <CarouselNext className="hidden sm:flex" />
          </Carousel>
        </div>
      </div>
    </section>
  )
}
