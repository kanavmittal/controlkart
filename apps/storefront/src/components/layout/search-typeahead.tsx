"use client"

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"

import { Input } from "@/components/ui/input"
import { formatINR } from "@/lib/format"
import { searchProducts, type SearchHit } from "@/lib/data/search"
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value"
import { cn } from "@/lib/utils"

const DEBOUNCE_MS = 300
const MIN_QUERY_LENGTH = 2
const SUGGESTION_LIMIT = 6

// Loose SKU heuristic: alphanumeric-led token, 5+ chars total, drawn only
// from a no-space charset — matches shapes like "CK-4501-B" or "MPN_22.A"
// without false-positiving on ordinary multi-word search phrases (which
// contain spaces and are excluded by construction, not by an extra check).
const SKU_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\-_/.]{4,}$/

type Row =
  | { kind: "sku"; sku: string; id: string }
  | { kind: "product"; hit: SearchHit; id: string }

export interface SearchTypeaheadProps {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  /** Narrows suggestions to a single brand — wired from the header's brand
   *  `Select` so the dropdown reflects the same filter the final `/products`
   *  submit will apply, not just the free-text term. */
  vendor?: string
}

/**
 * Drop-in replacement for the header search `Input`: same controlled
 * value/onChange contract as before (so `header-search.tsx`'s hidden-input
 * submit logic stays untouched), plus a debounced product suggestion
 * dropdown anchored under just this component's own wrapper (mega-menu.tsx
 * precedent — hand-rolled absolute panel, no Popover primitive; shadcn
 * popover isn't installed).
 *
 * Suggestions come from the Meilisearch-backed `/store/search` route (via
 * `searchProducts()`) rather than Medusa's built-in Postgres `q` search —
 * typo-tolerant, relevance-ranked, and already priced/vendor-tagged from
 * the search index so no second data round trip is needed here.
 *
 * The input stays a real child of the surrounding native `<form
 * action="/products" method="get">`: Enter with no active suggestion row is
 * never `preventDefault()`-ed, so it falls through to the browser's normal
 * form submission (full search) exactly as before this component existed.
 */
export function SearchTypeahead({
  id,
  value,
  onChange,
  placeholder,
  className,
  vendor,
}: SearchTypeaheadProps) {
  const router = useRouter()
  const generatedId = useId()
  const inputId = id ?? generatedId
  const listboxId = `${inputId}-listbox`

  const wrapperRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const trimmed = value.trim()
  // Debounce the network-bound term only; the SKU pinned row (below) reacts
  // instantly since it's a pure client-side pattern check, no fetch.
  const debouncedTerm = useDebouncedValue(trimmed, DEBOUNCE_MS)

  const queryEnabled = debouncedTerm.length >= MIN_QUERY_LENGTH

  const { data: hits, isFetching } = useQuery({
    // Local, component-scoped cache — namespaced "search-typeahead" per plan
    // T23, intentionally NOT added to the shared `lib/query-keys.ts` registry.
    queryKey: ["search-typeahead", debouncedTerm, vendor],
    enabled: queryEnabled,
    queryFn: async () => {
      const { hits } = await searchProducts({
        q: debouncedTerm,
        limit: SUGGESTION_LIMIT,
        vendor,
      })
      return hits
    },
    staleTime: 30_000,
  })

  const showSkuRow = SKU_PATTERN.test(trimmed)
  // Only trust "no matches" once the debounce has caught up to the latest
  // keystroke and the fetch for that exact term has resolved — avoids a
  // one-frame flash of the empty state while the user is still typing.
  const settled = queryEnabled && !isFetching && debouncedTerm === trimmed
  const noMatches = settled && (hits?.length ?? 0) === 0

  const rows: Row[] = useMemo(() => {
    const productRows: Row[] = (hits ?? []).map((hit) => ({
      kind: "product",
      hit,
      id: `${listboxId}-product-${hit.id}`,
    }))
    return showSkuRow
      ? [{ kind: "sku", sku: trimmed, id: `${listboxId}-sku` }, ...productRows]
      : productRows
  }, [hits, showSkuRow, trimmed, listboxId])

  // A stale index from a previous keystroke should never point past the end
  // of a freshly recomputed row set.
  useEffect(() => {
    setActiveIndex(-1)
  }, [rows.length, debouncedTerm, showSkuRow])

  const showPanel =
    isOpen &&
    trimmed.length > 0 &&
    (rows.length > 0 || (queryEnabled && isFetching) || noMatches)

  function navigateToRow(row: Row) {
    setIsOpen(false)
    setActiveIndex(-1)
    if (row.kind === "sku") {
      router.push(`/quick-order?sku=${encodeURIComponent(row.sku)}`)
    } else {
      router.push(`/products/${row.hit.handle}`)
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      if (!rows.length) return
      event.preventDefault()
      setIsOpen(true)
      setActiveIndex((prev) => (prev + 1) % rows.length)
    } else if (event.key === "ArrowUp") {
      if (!rows.length) return
      event.preventDefault()
      setIsOpen(true)
      setActiveIndex((prev) => (prev <= 0 ? rows.length - 1 : prev - 1))
    } else if (event.key === "Enter") {
      if (isOpen && activeIndex >= 0 && rows[activeIndex]) {
        event.preventDefault()
        navigateToRow(rows[activeIndex])
      }
      // else: no active row — fall through to the native form submit.
    } else if (event.key === "Escape") {
      if (isOpen) {
        event.preventDefault()
        setIsOpen(false)
        setActiveIndex(-1)
      }
    }
  }

  // Outside click closes the panel. Row selection itself never reaches this
  // listener because each row calls `preventDefault()` on `mousedown` (kept
  // below), which keeps focus in the input so no blur/outside-click ever
  // races the row's own `onClick`.
  useEffect(() => {
    if (!isOpen) return
    function handlePointerDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handlePointerDown)
    return () => document.removeEventListener("mousedown", handlePointerDown)
  }, [isOpen])

  // Screen-reader-only lifecycle announcer — separate from the *visual*
  // loading/no-match copy inside the dropdown panel below (which is only in
  // the DOM while `showPanel` is true, so an `aria-live` region there
  // wouldn't reliably announce changes). This node stays permanently
  // mounted so its text changes are what `aria-live` actually observes.
  const statusMessage =
    queryEnabled && isFetching
      ? "Searching…"
      : noMatches
        ? "No results found"
        : settled && rows.length > 0
          ? `${rows.length} result${rows.length === 1 ? "" : "s"} found`
          : ""

  return (
    <div ref={wrapperRef} className="relative min-w-0 flex-1">
      <label htmlFor={inputId} className="sr-only">
        {placeholder ?? "Search"}
      </label>
      <Input
        id={inputId}
        type="text"
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
          if (event.target.value.trim().length > 0) setIsOpen(true)
        }}
        onFocus={() => {
          if (trimmed.length > 0) setIsOpen(true)
        }}
        onBlur={() => setIsOpen(false)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        role="combobox"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={showPanel}
        aria-controls={listboxId}
        aria-activedescendant={
          activeIndex >= 0 && rows[activeIndex] ? rows[activeIndex].id : undefined
        }
        className={className}
      />

      <div role="status" aria-live="polite" className="sr-only">
        {statusMessage}
      </div>

      {showPanel && (
        <div className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-[var(--radius)] border border-athens-line bg-background shadow-[0_20px_30px_rgba(0,0,0,0.08)]">
          <ul
            id={listboxId}
            role="listbox"
            aria-label="Search suggestions"
            className="max-h-[70vh] overflow-y-auto py-1"
          >
            {rows.map((row, index) => {
              const active = index === activeIndex

              if (row.kind === "sku") {
                return (
                  <li
                    key={row.id}
                    id={row.id}
                    role="option"
                    aria-selected={active}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => navigateToRow(row)}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 border-b border-athens-line px-4 py-2.5 text-[14px] font-medium text-athens-dark",
                      active && "bg-muted"
                    )}
                  >
                    <span className="min-w-0 truncate">
                      Quick order &ldquo;{row.sku}&rdquo;
                    </span>
                    <span aria-hidden="true" className="ml-auto shrink-0">
                      →
                    </span>
                  </li>
                )
              }

              const hit = row.hit

              return (
                <li
                  key={row.id}
                  id={row.id}
                  role="option"
                  aria-selected={active}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => navigateToRow(row)}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 px-4 py-2 text-[14px]",
                    active && "bg-muted"
                  )}
                >
                  <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-[3px] bg-[var(--color-surface-alt)]">
                    {hit.thumbnail ? (
                      <Image
                        src={hit.thumbnail}
                        alt=""
                        fill
                        sizes="36px"
                        className="object-cover"
                      />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-athens-dark">
                    {hit.title}
                  </span>
                  {hit.price !== null && (
                    <span className="shrink-0 text-[13px] font-medium text-athens-dark">
                      {formatINR(hit.price.amount)}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>

          {queryEnabled && isFetching && (
            <div className="flex items-center justify-center gap-2 border-t border-athens-line px-4 py-3 text-[13px] text-athens-body">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Searching…
            </div>
          )}

          {noMatches && (
            <div className="px-4 py-3 text-[13px] text-athens-body">
              No matches — press Enter to search all products
            </div>
          )}
        </div>
      )}
    </div>
  )
}
