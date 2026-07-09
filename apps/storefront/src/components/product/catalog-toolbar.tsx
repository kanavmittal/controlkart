"use client"

import type { ReactNode } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { SlidersHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"
import type { SpecSortOption } from "@/lib/data/types"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

export type CatalogToolbarProps = {
  count: number
  sortable: SpecSortOption[]
  filtersSlot?: ReactNode
  compareEnabled?: boolean
  onCompareToggle?: (on: boolean) => void
  className?: string
}

/**
 * Catalog toolbar row above a product grid: result count, a (for-now dumb)
 * Compare toggle, and the sort-by control.
 *
 * Sort URL mechanics (`?sort=<attribute_code>:asc|desc`, unknown values
 * falling back to "Relevance", all other params preserved) are ported
 * verbatim from `products/spec-sort-dropdown.tsx` — that file is left in
 * place (deletion owner: T21) and still used by `/products` and
 * `/categories/[handle]` until they're rebuilt.
 *
 * The Compare toggle is intentionally "dumb": it's fully controlled via
 * `compareEnabled`/`onCompareToggle` so callers can mount this toolbar
 * before the real compare context (T25) lands. Both props default to a
 * no-op unchecked control.
 */
export function CatalogToolbar({
  count,
  sortable,
  filtersSlot,
  compareEnabled = false,
  onCompareToggle = () => {},
  className,
}: CatalogToolbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const sortValue = searchParams.get("sort")
  const isKnown = sortable.some(
    (s) =>
      sortValue === `${s.attribute_code}:asc` ||
      sortValue === `${s.attribute_code}:desc`
  )
  const current = isKnown && sortValue ? sortValue : ""

  const onSortChange = (next: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (next) {
      params.set("sort", next)
    } else {
      params.delete("sort")
    }
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-4 rounded-[5px] bg-[#f8f8f8] px-6 py-4",
        className
      )}
    >
      <div className="flex items-center gap-4">
        {filtersSlot ? (
          <Sheet>
            <SheetTrigger
              render={<Button variant="outline" size="sm" className="lg:hidden" />}
            >
              <SlidersHorizontal data-icon="inline-start" />
              Filters
            </SheetTrigger>
            <SheetContent side="left" className="overflow-y-auto">
              <SheetTitle className="px-4 pt-4">Filters</SheetTitle>
              <div className="px-4 pb-4">{filtersSlot}</div>
            </SheetContent>
          </Sheet>
        ) : null}
        <span className="text-[15px] font-medium text-[#232323]">
          {count} product{count === 1 ? "" : "s"}
        </span>
      </div>

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-[15px] text-[#676767]">
          Compare
          <Checkbox
            checked={compareEnabled}
            onCheckedChange={(checked) => onCompareToggle(checked)}
          />
        </label>
        <span className="hidden h-6 w-px bg-[#dfdfdf] min-[750px]:block" />
        {sortable.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="whitespace-nowrap text-[15px] text-[#676767]">
              Sort by
            </span>
            <Select value={current} onValueChange={onSortChange}>
              <SelectTrigger className="h-[42px] w-auto min-w-[180px] rounded-[5px] border-[#dfdfdf] bg-white px-4 text-[15px] text-[#232323]">
                <SelectValue placeholder="Relevance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Relevance</SelectItem>
                {sortable.map((s) => (
                  <SelectGroupOptions key={s.attribute_code} option={s} />
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  )
}

function SelectGroupOptions({ option }: { option: SpecSortOption }) {
  const unitLabel = option.unit ? ` (${option.unit})` : ""
  return (
    <>
      <SelectItem value={`${option.attribute_code}:asc`}>
        {option.name}
        {unitLabel} — low to high
      </SelectItem>
      <SelectItem value={`${option.attribute_code}:desc`}>
        {option.name}
        {unitLabel} — high to low
      </SelectItem>
    </>
  )
}
