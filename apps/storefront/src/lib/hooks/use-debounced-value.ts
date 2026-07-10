"use client"

import { useEffect, useState } from "react"

/**
 * Returns `value`, delayed by `delayMs` — resets the timer on every change
 * so only the last value in a burst commits. Extracted from
 * `search-typeahead.tsx`'s original inline debounce (identical semantics);
 * seeding state with `value` itself (rather than a fixed empty default)
 * means a caller with a non-empty initial value — e.g. `products-browser.tsx`
 * seeded from a URL `?q=` — sees it immediately instead of a spurious first
 * debounce delay.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(handle)
  }, [value, delayMs])

  return debounced
}
