"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import type { SpecSortOption } from "@/lib/data/types"

/**
 * Sort-by-spec control. The chosen sort lives in the URL (`?sort=code:dir`) so
 * it's server-rendered and shareable, and it preserves any other params
 * (`?specs=`, `?category=`). Options come from the category's comparable specs.
 */
export function SpecSortDropdown({
  sortable,
  value,
}: {
  sortable: SpecSortOption[]
  value?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  if (!sortable.length) {
    return null
  }

  // A persisted ?sort= may reference an attribute not sortable in this category;
  // fall back to "Relevance" so the control reflects what's actually applied.
  const isKnown = sortable.some(
    (s) =>
      value === `${s.attribute_code}:asc` ||
      value === `${s.attribute_code}:desc`
  )
  const current = isKnown ? value : ""

  const onChange = (next: string) => {
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
    <label className="flex items-center gap-2 text-sm text-[var(--color-ink-muted)]">
      <span className="whitespace-nowrap">Sort by</span>
      <select
        value={current ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-1.5 text-sm outline-none focus:border-[var(--color-line-strong)]"
      >
        <option value="">Relevance</option>
        {sortable.map((s) => [
          <option key={`${s.attribute_code}:asc`} value={`${s.attribute_code}:asc`}>
            {s.name}
            {s.unit ? ` (${s.unit})` : ""} — low to high
          </option>,
          <option
            key={`${s.attribute_code}:desc`}
            value={`${s.attribute_code}:desc`}
          >
            {s.name}
            {s.unit ? ` (${s.unit})` : ""} — high to low
          </option>,
        ])}
      </select>
    </label>
  )
}
