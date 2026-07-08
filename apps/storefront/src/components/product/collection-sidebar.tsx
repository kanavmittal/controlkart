"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { parseSpecParam } from "@/lib/specs"
import type { SpecFacetDTO } from "@/lib/data/types"

/**
 * Athens restyle of the legacy spec-filter sidebar (deleted in T21 with the
 * /products rebuild — see plan T18). Visual structure ported from
 * `my-clone/src/components/CollectionSidebar.tsx` (Categories tree above
 * collapsible facet groups); behavior ported from the old sidebar.
 */

export type CollectionSidebarCategoryLink = {
  label: string
  href: string
  active?: boolean
  children?: CollectionSidebarCategoryLink[]
}

export interface CollectionSidebarProps {
  facets: SpecFacetDTO[]
  /** Optional Categories tree rendered above the facet groups, mirroring the
   * clone's "Categories" section. The caller (category page / `/products`)
   * supplies fully-resolved links + active state — this component does no
   * category data fetching or route-matching of its own. */
  categories?: CollectionSidebarCategoryLink[]
  /** Current page path (e.g. `/categories/valves` or `/products`) used to
   * build the `router.push` target — passed explicitly by the caller instead
   * of read via `usePathname()` so this component works identically from
   * either route. */
  basePath: string
}

/** `min-max` — both halves optional, e.g. `"-4999"` (no floor) or `"500-"`
 * (no ceiling). Mirrors the `?specs=` param's "absent means unset" rule. */
function parsePriceParam(raw: string | null): { min: string; max: string } {
  if (!raw) {
    return { min: "", max: "" }
  }
  const [min = "", max = ""] = raw.split("-")
  return { min, max }
}

export function CollectionSidebar({
  facets,
  categories,
  basePath,
}: CollectionSidebarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const specsParam = searchParams.get("specs") ?? undefined
  const selected = React.useMemo(
    () => parseSpecParam(specsParam),
    [specsParam]
  )

  // --- specs facets — ported verbatim from spec-filter-sidebar.tsx `apply`/
  // `toggle` (same `?specs=` param name, same JSON shape, same `scroll:
  // false` push behavior); only the pathname source changed (`basePath`
  // prop instead of `usePathname()`).
  const applySpecs = React.useCallback(
    (next: Record<string, string[]>) => {
      const cleaned = Object.fromEntries(
        Object.entries(next).filter(([, vals]) => vals.length > 0)
      )
      // Preserve any other params (e.g. ?category=, ?sort=) already on the URL.
      const params = new URLSearchParams(searchParams.toString())
      if (Object.keys(cleaned).length) {
        params.set("specs", JSON.stringify(cleaned))
      } else {
        params.delete("specs")
      }
      const qs = params.toString()
      router.push(qs ? `${basePath}?${qs}` : basePath, { scroll: false })
    },
    [router, basePath, searchParams]
  )

  const toggleSpec = (code: string, value: string) => {
    const current = selected[code] ?? []
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value]
    applySpecs({ ...selected, [code]: next })
  }

  const activeSpecCount = Object.values(selected).reduce(
    (sum, vals) => sum + vals.length,
    0
  )

  // --- price overlay — NEW, not part of the preserved `?specs=` contract.
  // Client-side-only param (`?price=<min>-<max>`); intersected against
  // facet product_ids by the caller/toolbar, not this component.
  const priceParam = searchParams.get("price")
  const [minPrice, setMinPrice] = React.useState(
    () => parsePriceParam(priceParam).min
  )
  const [maxPrice, setMaxPrice] = React.useState(
    () => parsePriceParam(priceParam).max
  )

  // Keep the inputs in sync with back/forward navigation and "Clear all".
  React.useEffect(() => {
    const parsed = parsePriceParam(priceParam)
    setMinPrice(parsed.min)
    setMaxPrice(parsed.max)
  }, [priceParam])

  const applyPrice = () => {
    const min = minPrice.trim()
    const max = maxPrice.trim()
    const params = new URLSearchParams(searchParams.toString())
    if (!min && !max) {
      params.delete("price")
    } else {
      params.set("price", `${min}-${max}`)
    }
    const qs = params.toString()
    router.push(qs ? `${basePath}?${qs}` : basePath, { scroll: false })
  }

  const hasPrice = Boolean(priceParam)
  const hasActiveFilters = activeSpecCount > 0 || hasPrice

  const clearAll = () => {
    // Clears specs + price, keeps everything else on the URL (sort included).
    const params = new URLSearchParams(searchParams.toString())
    params.delete("specs")
    params.delete("price")
    const qs = params.toString()
    router.push(qs ? `${basePath}?${qs}` : basePath, { scroll: false })
  }

  const defaultOpen = React.useMemo(() => {
    const values = facets.map((facet) => facet.attribute_code)
    if (categories?.length) {
      values.unshift("categories")
    }
    return values
  }, [facets, categories])

  if (!facets.length && !categories?.length) {
    return null
  }

  return (
    <aside className="w-full shrink-0 lg:w-[275px]">
      <div className="flex items-center justify-between pb-2">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Filters
        </h2>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-primary underline"
          >
            Clear all
          </button>
        ) : null}
      </div>

      <Accordion multiple defaultValue={defaultOpen}>
        {categories?.length ? (
          <AccordionItem value="categories">
            <AccordionTrigger className="border-b border-border py-4 text-[13px] font-medium tracking-[0.04em] text-[var(--color-athens-dark)] uppercase hover:no-underline">
              Categories
            </AccordionTrigger>
            <AccordionContent className="pt-1 pb-4">
              <CategoryTree links={categories} />
            </AccordionContent>
          </AccordionItem>
        ) : null}

        {facets.map((facet) => (
          <AccordionItem key={facet.attribute_code} value={facet.attribute_code}>
            <AccordionTrigger className="border-b border-border py-4 text-[13px] font-medium tracking-[0.04em] text-[var(--color-athens-dark)] uppercase hover:no-underline">
              {facet.name}
              {facet.unit ? (
                <span className="normal-case text-muted-foreground"> ({facet.unit})</span>
              ) : null}
            </AccordionTrigger>
            <AccordionContent className="pt-1 pb-4">
              <ul className="flex flex-col gap-2">
                {facet.values.map(({ value, count }) => {
                  const checked = (selected[facet.attribute_code] ?? []).includes(
                    value
                  )
                  return (
                    <li key={value} className="flex items-center justify-between gap-2">
                      <label className="flex flex-1 cursor-pointer items-center gap-2.5 text-[15px] text-muted-foreground">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleSpec(facet.attribute_code, value)}
                        />
                        {value}
                      </label>
                      <span className="text-[13px] text-muted-foreground/70">{count}</span>
                    </li>
                  )
                })}
              </ul>
            </AccordionContent>
          </AccordionItem>
        ))}

        <AccordionItem value="price">
          <AccordionTrigger className="border-b border-border py-4 text-[13px] font-medium tracking-[0.04em] text-[var(--color-athens-dark)] uppercase hover:no-underline">
            Price
          </AccordionTrigger>
          <AccordionContent className="pt-1 pb-4">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                inputMode="numeric"
                placeholder="Min"
                min={0}
                value={minPrice}
                onChange={(event) => setMinPrice(event.target.value)}
                className="h-[42px] rounded-[5px] text-[14px]"
              />
              <span className="text-muted-foreground">–</span>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="Max"
                min={0}
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
                className="h-[42px] rounded-[5px] text-[14px]"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={applyPrice}
              className="mt-3 w-full"
            >
              Apply
            </Button>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </aside>
  )
}

function CategoryTree({ links }: { links: CollectionSidebarCategoryLink[] }) {
  return (
    <ul className="space-y-1">
      {links.map((link) => (
        <li key={link.href}>
          <Link
            href={link.href}
            className={cn(
              "text-[15px] leading-8",
              link.active
                ? "text-primary"
                : "text-muted-foreground hover:text-[var(--color-athens-dark)] hover:underline"
            )}
          >
            {link.label}
          </Link>
          {link.children?.length ? (
            <ul className="ml-3 space-y-0.5">
              {link.children.map((child) => (
                <li key={child.href}>
                  <Link
                    href={child.href}
                    className={cn(
                      "text-[14px] leading-7",
                      child.active
                        ? "text-primary"
                        : "text-muted-foreground hover:text-[var(--color-athens-dark)] hover:underline"
                    )}
                  >
                    {child.label}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
