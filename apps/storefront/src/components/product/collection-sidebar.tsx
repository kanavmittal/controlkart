"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronDown } from "lucide-react"

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
 *
 * Categories redesign (facet-sidebar-redesign): the Categories group is now
 * always populated with the FULL top-level tree (callers pass every
 * top-level category with its children one level deep — see
 * `categoryLinks` construction in the category/[handle] and /products
 * pages), not just the current category's children. Each top-level row gets
 * its own local expand/collapse toggle (independent of the outer Accordion,
 * which only governs whole facet-group visibility).
 */

export type CollectionSidebarCategoryLink = {
  label: string
  href: string
  active?: boolean
  children?: CollectionSidebarCategoryLink[]
  /** Initial expand state for this row's children submenu. Callers set this
   * true on the top-level item whose subtree contains the active category,
   * so the relevant branch auto-expands even though `active` itself is only
   * set on the exact matching link. */
  defaultExpanded?: boolean
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

  // Athens-style group header: uppercase 13px tracking-wide dark label, the
  // Accordion trigger's own built-in chevron (down/up swap on open) serves
  // as the collapse indicator on the right. Group separators are dashed
  // hairlines on the AccordionItem itself (so the line sits below the
  // content, matching the clone's `<details className="border-b ...">`
  // wrapper), not on the trigger.
  const groupItemClass =
    "border-b border-dashed border-[var(--color-athens-line)]"
  const groupTriggerClass =
    "py-3.5 text-[13px] font-medium tracking-[0.04em] text-[var(--color-athens-dark)] uppercase hover:no-underline"

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

      <Accordion
        multiple
        defaultValue={defaultOpen}
        className="border-t border-dashed border-[var(--color-athens-line)]"
      >
        {categories?.length ? (
          <AccordionItem value="categories" className={groupItemClass}>
            <AccordionTrigger className={groupTriggerClass}>
              Categories
            </AccordionTrigger>
            <AccordionContent className="pt-1 pb-4">
              <CategoryTree links={categories} />
            </AccordionContent>
          </AccordionItem>
        ) : null}

        {facets.map((facet) => (
          <AccordionItem
            key={facet.attribute_code}
            value={facet.attribute_code}
            className={groupItemClass}
          >
            <AccordionTrigger className={groupTriggerClass}>
              {facet.name}
              {facet.unit ? (
                <span className="normal-case text-muted-foreground"> ({facet.unit})</span>
              ) : null}
            </AccordionTrigger>
            <AccordionContent className="pt-1 pb-4">
              <ul className="flex flex-col gap-2.5">
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
                          className="rounded-[3px]"
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

        <AccordionItem value="price" className={groupItemClass}>
          <AccordionTrigger className={groupTriggerClass}>
            Price
          </AccordionTrigger>
          <AccordionContent className="pt-1 pb-4">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                inputMode="numeric"
                placeholder="From"
                min={0}
                value={minPrice}
                onChange={(event) => setMinPrice(event.target.value)}
                className="h-[42px] rounded-[5px] text-[14px]"
              />
              <span className="text-muted-foreground">–</span>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="To"
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

/** Always-visible top-level category list (Athens `navigation-side`): every
 * top-level item is a row with its link on the left and — when it has
 * children — a small bordered square toggle on the right that expands an
 * indented submenu. Expand state is local to each row (independent of the
 * outer Accordion, which only toggles whole facet-group visibility). */
function CategoryTree({ links }: { links: CollectionSidebarCategoryLink[] }) {
  return (
    <ul>
      {links.map((link) => (
        <CategoryTreeRow key={link.href} link={link} />
      ))}
    </ul>
  )
}

function CategoryTreeRow({ link }: { link: CollectionSidebarCategoryLink }) {
  const hasChildren = Boolean(link.children?.length)
  const [open, setOpen] = React.useState(
    () => link.defaultExpanded ?? link.active ?? false
  )

  return (
    <li className="border-b border-[var(--color-athens-line)] last:border-b-0">
      <div className="flex items-center justify-between gap-2 py-3">
        <Link
          href={link.href}
          className={cn(
            "text-[15px]",
            link.active
              ? "text-primary"
              : "text-muted-foreground hover:text-[var(--color-athens-dark)] hover:underline"
          )}
        >
          {link.label}
        </Link>
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            aria-expanded={open}
            aria-label={
              open ? `Collapse ${link.label}` : `Expand ${link.label}`
            }
            className="flex size-7 shrink-0 items-center justify-center rounded-[5px] border border-[var(--color-athens-line)] text-[var(--color-athens-body)] transition-colors hover:border-[var(--color-athens-dark)] hover:text-[var(--color-athens-dark)]"
          >
            <ChevronDown
              aria-hidden
              className={cn(
                "size-3.5 transition-transform",
                open && "rotate-180"
              )}
            />
          </button>
        ) : null}
      </div>
      {hasChildren && open ? (
        <ul className="mb-3 ml-1 flex flex-col gap-2 border-l border-[var(--color-athens-line)] pl-3">
          {link.children!.map((child) => (
            <li key={child.href}>
              <Link
                href={child.href}
                className={cn(
                  "text-[14px]",
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
  )
}
