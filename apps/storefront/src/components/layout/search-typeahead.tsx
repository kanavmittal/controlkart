"use client"

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { ChevronRight, Loader2 } from "lucide-react"

import { Input } from "@/components/ui/input"
import { formatINR } from "@/lib/format"
import { searchProducts, type SearchHit } from "@/lib/data/search"
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value"
import { cn } from "@/lib/utils"

const DEBOUNCE_MS = 300
const MIN_QUERY_LENGTH = 2
const SUGGESTION_LIMIT = 5
const MAX_SIDE_SUGGESTIONS = 6

// Loose SKU heuristic: alphanumeric-led token, 5+ chars total, drawn only
// from a no-space charset — matches shapes like "CK-4501-B" or "MPN_22.A"
// without false-positiving on ordinary multi-word search phrases (which
// contain spaces and are excluded by construction, not by an extra check).
const SKU_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\-_/.]{4,}$/

type Suggestion = { key: string; label: string; href: string }

type Row =
  | { kind: "sku"; sku: string; id: string }
  | { kind: "suggestion"; suggestion: Suggestion; id: string }
  | { kind: "product"; hit: SearchHit; id: string }
  | { kind: "submit"; id: string }

/** Bolds the first case-insensitive occurrence of `query` inside `label`
 *  (the Athens `<mark>` pattern) — no highlight when the match came via a
 *  typo/synonym and the raw substring isn't present. */
function highlightMatch(label: string, query: string): ReactNode {
  const idx = label.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1 || !query) {
    return label
  }
  return (
    <>
      {label.slice(0, idx)}
      <mark className="bg-transparent font-semibold text-inherit">
        {label.slice(idx, idx + query.length)}
      </mark>
      {label.slice(idx + query.length)}
    </>
  )
}

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
 * Header predictive search: a debounced, Meilisearch-backed (`/store/search`
 * via `searchProducts()`) two-column dropdown in the Athens-theme style —
 * "Suggestions" (matching categories/brands derived from the hits, linking
 * to the filtered `/products` views) on the left, "Products" (thumbnail,
 * vendor, title, price) on the right, and a full-width "Search for “q”"
 * submit row at the bottom.
 *
 * The panel is absolutely positioned against the surrounding FORM (which
 * carries `relative` — see header-search.tsx), not this component's own
 * wrapper, so it spans the full search-bar width like the reference theme.
 *
 * The input stays a real child of the native `<form action="/products"
 * method="get">`: Enter with no active row falls through to normal form
 * submission, and the footer row is a genuine `type="submit"` button.
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

  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const trimmed = value.trim()
  // Debounce the network-bound term only; the SKU pinned row (below) reacts
  // instantly since it's a pure client-side pattern check, no fetch.
  const debouncedTerm = useDebouncedValue(trimmed, DEBOUNCE_MS)

  const queryEnabled = debouncedTerm.length >= MIN_QUERY_LENGTH

  const { data: hits, isFetching } = useQuery({
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

  // "Suggestions" column: distinct categories and brands drawn from the
  // hits themselves — each links to the corresponding filtered /products
  // view. (Shopify's equivalent column is query-completion analytics; for a
  // B2B parts catalog, category/brand jumps are the more useful shape.)
  const suggestions: Suggestion[] = useMemo(() => {
    const out: Suggestion[] = []
    const seen = new Set<string>()
    for (const hit of hits ?? []) {
      for (const category of hit.categories) {
        const key = `c:${category.id}`
        if (category.handle && !seen.has(key)) {
          seen.add(key)
          out.push({
            key,
            label: category.name,
            href: `/products?category=${encodeURIComponent(category.handle)}`,
          })
        }
      }
      if (hit.vendor) {
        const key = `v:${hit.vendor}`
        if (!seen.has(key)) {
          seen.add(key)
          out.push({
            key,
            label: hit.vendor,
            href: `/products?vendor=${encodeURIComponent(hit.vendor)}`,
          })
        }
      }
    }
    return out.slice(0, MAX_SIDE_SUGGESTIONS)
  }, [hits])

  const showSkuRow = SKU_PATTERN.test(trimmed)
  // Only trust "no matches" once the debounce has caught up to the latest
  // keystroke and the fetch for that exact term has resolved — avoids a
  // one-frame flash of the empty state while the user is still typing.
  const settled = queryEnabled && !isFetching && debouncedTerm === trimmed
  const noMatches = settled && (hits?.length ?? 0) === 0

  // Flat keyboard-navigation order: SKU quick-order, suggestions (left
  // column), products (right column), then the submit row.
  const rows: Row[] = useMemo(() => {
    const out: Row[] = []
    if (showSkuRow) {
      out.push({ kind: "sku", sku: trimmed, id: `${listboxId}-sku` })
    }
    for (const suggestion of suggestions) {
      out.push({
        kind: "suggestion",
        suggestion,
        id: `${listboxId}-suggestion-${suggestion.key}`,
      })
    }
    for (const hit of hits ?? []) {
      out.push({ kind: "product", hit, id: `${listboxId}-product-${hit.id}` })
    }
    if (trimmed.length > 0) {
      out.push({ kind: "submit", id: `${listboxId}-submit` })
    }
    return out
  }, [showSkuRow, trimmed, suggestions, hits, listboxId])

  // A stale index from a previous keystroke should never survive ANY row-set
  // recompute — keying on the memoized `rows` identity (not just length)
  // also covers same-length swaps, e.g. a vendor change refetching the same
  // number of hits.
  useEffect(() => {
    setActiveIndex(-1)
  }, [rows])

  const showPanel =
    isOpen &&
    trimmed.length > 0 &&
    (rows.length > 0 || (queryEnabled && isFetching) || noMatches)

  function navigateToRow(row: Row) {
    if (row.kind === "submit") {
      // Unreachable in practice — the footer is a real type="submit" button
      // (mouse) and keyboard Enter falls through to native submit — kept as
      // a guard so a future caller can't route it into router.push below.
      return
    }
    setIsOpen(false)
    setActiveIndex(-1)
    if (row.kind === "sku") {
      router.push(`/quick-order?sku=${encodeURIComponent(row.sku)}`)
    } else if (row.kind === "suggestion") {
      router.push(row.suggestion.href)
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
        const row = rows[activeIndex]
        if (row.kind !== "submit") {
          event.preventDefault()
          navigateToRow(row)
        }
        // submit row: fall through to the native form submit.
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
  // listener because each row calls `preventDefault()` on `mousedown`, which
  // keeps focus in the input so no blur/outside-click ever races the row's
  // own `onClick`.
  useEffect(() => {
    if (!isOpen) return
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node
      if (
        !panelRef.current?.contains(target) &&
        !inputRef.current?.contains(target)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handlePointerDown)
    return () => document.removeEventListener("mousedown", handlePointerDown)
  }, [isOpen])

  // Screen-reader-only lifecycle announcer — permanently mounted (aria-live
  // only reliably announces on persistent nodes), separate from the visual
  // loading/no-match copy inside the panel.
  const statusMessage =
    queryEnabled && isFetching
      ? "Searching…"
      : noMatches
        ? "No results found"
        : settled && (hits?.length ?? 0) > 0
          ? `${hits!.length} result${hits!.length === 1 ? "" : "s"} found`
          : ""

  const rowInteractions = (row: Row, index: number) => ({
    onMouseDown: (event: React.MouseEvent) => event.preventDefault(),
    onMouseEnter: () => setActiveIndex(index),
    onClick: () => navigateToRow(row),
  })

  const activeId =
    activeIndex >= 0 && rows[activeIndex] ? rows[activeIndex].id : undefined

  // Row indexes per section (rows[] order: sku → suggestions → products →
  // submit) so mouse hover and aria ids line up with keyboard order.
  const skuOffset = 0
  const suggestionOffset = showSkuRow ? 1 : 0
  const productOffset = suggestionOffset + suggestions.length
  const submitIndex = rows.length - 1

  const hasSuggestionColumn = showSkuRow || suggestions.length > 0

  return (
    <div className="min-w-0 flex-1">
      <label htmlFor={inputId} className="sr-only">
        {placeholder ?? "Search"}
      </label>
      <Input
        ref={inputRef}
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
        aria-activedescendant={activeId}
        className={className}
      />

      <div role="status" aria-live="polite" className="sr-only">
        {statusMessage}
      </div>

      {showPanel && (
        <div
          ref={panelRef}
          id={listboxId}
          role="listbox"
          aria-label="Search suggestions"
          // Panel-level mousedown preventDefault keeps focus in the input
          // for EVERY press inside the panel — including the scrollbar of
          // the overflow container and section headings/whitespace — so
          // onBlur can't close the dropdown mid-scroll.
          onMouseDown={(event) => event.preventDefault()}
          className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-[var(--radius)] border border-athens-line bg-background shadow-[0_20px_40px_rgba(0,0,0,0.12)]"
        >
          <div
            className={cn(
              "grid max-h-[min(70vh,640px)] overflow-y-auto",
              hasSuggestionColumn && "sm:grid-cols-[minmax(200px,260px)_1fr]"
            )}
          >
            {hasSuggestionColumn && (
              <div className="px-5 pb-3 pt-4 sm:border-r sm:border-athens-line">
                <h3 className="border-b border-athens-line pb-2 text-[15px] font-semibold text-athens-dark">
                  Suggestions
                </h3>
                <ul className="mt-1">
                  {showSkuRow && (
                    <li
                      id={rows[skuOffset]?.id}
                      role="option"
                      aria-selected={activeIndex === skuOffset}
                      {...rowInteractions(rows[skuOffset], skuOffset)}
                      className={cn(
                        "-mx-2 flex cursor-pointer items-center gap-2 rounded-[4px] px-2 py-2 text-[15px] font-medium text-athens-dark",
                        activeIndex === skuOffset && "bg-muted"
                      )}
                    >
                      <span className="min-w-0 truncate">
                        Quick order &ldquo;{trimmed}&rdquo;
                      </span>
                      <span aria-hidden="true" className="ml-auto shrink-0">
                        →
                      </span>
                    </li>
                  )}
                  {suggestions.map((suggestion, i) => {
                    const index = suggestionOffset + i
                    return (
                      <li
                        key={suggestion.key}
                        id={rows[index]?.id}
                        role="option"
                        aria-selected={activeIndex === index}
                        {...rowInteractions(rows[index], index)}
                        className={cn(
                          "-mx-2 cursor-pointer rounded-[4px] px-2 py-2 text-[15px] text-athens-dark",
                          activeIndex === index && "bg-muted"
                        )}
                      >
                        {highlightMatch(suggestion.label, trimmed)}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            <div className="px-5 pb-3 pt-4">
              <h3 className="border-b border-athens-line pb-2 text-[15px] font-semibold text-athens-dark">
                Products
              </h3>
              {(hits?.length ?? 0) > 0 ? (
                <ul className="mt-1">
                  {(hits ?? []).map((hit, i) => {
                    const index = productOffset + i
                    return (
                      <li
                        key={hit.id}
                        id={rows[index]?.id}
                        role="option"
                        aria-selected={activeIndex === index}
                        {...rowInteractions(rows[index], index)}
                        className={cn(
                          "-mx-2 flex cursor-pointer items-start gap-4 rounded-[4px] px-2 py-3",
                          activeIndex === index && "bg-muted"
                        )}
                      >
                        <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[3px] border border-athens-line bg-[var(--color-surface-alt)]">
                          {hit.thumbnail ? (
                            <Image
                              src={hit.thumbnail}
                              alt=""
                              fill
                              sizes="64px"
                              className="object-cover"
                            />
                          ) : null}
                        </span>
                        <span className="min-w-0 flex-1">
                          {hit.vendor && (
                            <span className="block text-[13px] text-athens-body">
                              {hit.vendor}
                            </span>
                          )}
                          <span className="block text-[15px] leading-snug text-athens-dark [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden">
                            {highlightMatch(hit.title, trimmed)}
                          </span>
                          {hit.price !== null && (
                            <span className="mt-0.5 block text-[15px] font-semibold text-athens-dark">
                              {formatINR(hit.price.amount)}{" "}
                              <span className="text-[12px] font-normal text-athens-body">
                                incl. GST
                              </span>
                            </span>
                          )}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              ) : queryEnabled && isFetching ? (
                <div className="flex items-center gap-2 py-4 text-[13px] text-athens-body">
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Searching…
                </div>
              ) : (
                <p className="py-4 text-[13px] text-athens-body">
                  No matches — press Enter to search all products
                </p>
              )}
            </div>
          </div>

          {trimmed.length > 0 && (
            <button
              type="submit"
              id={rows[submitIndex]?.id}
              role="option"
              aria-selected={activeIndex === submitIndex}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(submitIndex)}
              className={cn(
                "flex w-full items-center justify-between border-t border-dashed border-athens-line px-5 py-4 text-left text-[15px] text-athens-dark",
                activeIndex === submitIndex && "bg-muted"
              )}
            >
              <span>Search for &ldquo;{trimmed}&rdquo;</span>
              <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
