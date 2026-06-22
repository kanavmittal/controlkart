"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useCallback } from "react"
import type { SpecFacetDTO } from "@/lib/data/types"

type Props = {
  facets: SpecFacetDTO[]
  selected: Record<string, string[]>
}

/**
 * Storefront spec facet filter. Selection lives in the URL (`?specs=<json>`)
 * so it's shareable and server-rendered; toggling navigates to the new URL.
 */
export function SpecFilterSidebar({ facets, selected }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const apply = useCallback(
    (next: Record<string, string[]>) => {
      const cleaned = Object.fromEntries(
        Object.entries(next).filter(([, vals]) => vals.length > 0)
      )
      // Preserve any other params (e.g. ?category=) already on the URL.
      const params = new URLSearchParams(searchParams.toString())
      if (Object.keys(cleaned).length) {
        params.set("specs", JSON.stringify(cleaned))
      } else {
        params.delete("specs")
      }
      const qs = params.toString()
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [router, pathname, searchParams]
  )

  const toggle = (code: string, value: string) => {
    const current = selected[code] ?? []
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value]
    apply({ ...selected, [code]: next })
  }

  const activeCount = Object.values(selected).reduce(
    (sum, vals) => sum + vals.length,
    0
  )

  if (!facets.length) {
    return null
  }

  return (
    <aside className="w-full lg:w-60 lg:shrink-0">
      <div className="flex items-center justify-between border-b border-[var(--color-line)] pb-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
          Filter by specs
        </h2>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => apply({})}
            className="text-xs text-[var(--color-accent)] underline"
          >
            Clear
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-5">
        {facets.map((facet) => (
          <div key={facet.attribute_code}>
            <h3 className="text-sm font-medium">
              {facet.name}
              {facet.unit ? (
                <span className="text-[var(--color-ink-faint)]">
                  {" "}
                  ({facet.unit})
                </span>
              ) : null}
            </h3>
            <ul className="mt-2 flex flex-col gap-1.5">
              {facet.values.map(({ value, count }) => {
                const checked = (selected[facet.attribute_code] ?? []).includes(
                  value
                )
                return (
                  <li key={value}>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--color-ink-muted)]">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(facet.attribute_code, value)}
                        className="h-3.5 w-3.5 accent-[var(--color-accent)]"
                      />
                      <span className="flex-1">{value}</span>
                      <span className="text-xs text-[var(--color-ink-faint)]">
                        {count}
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  )
}
