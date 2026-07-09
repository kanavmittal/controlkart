"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { toast } from "sonner"

const COMPARE_STORAGE_KEY = "_ck_compare"
const COMPARE_MAX = 5

interface CompareContextValue {
  ids: string[]
  toggle: (id: string) => void
  remove: (id: string) => void
  clear: () => void
  isSelected: (id: string) => boolean
  count: number
}

const CompareContext = createContext<CompareContextValue | null>(null)

// Fallback returned by `useCompare()` when no `CompareProvider` is mounted —
// same pattern as `cart-drawer-context.tsx`'s `NOOP_CART_DRAWER`. Integration
// of the compare tray into category/products pages (and the eventual global
// mount) is a later task, so any early caller (e.g. `CompareCardCheckbox`
// dropped onto a card before that lands) must degrade harmlessly instead of
// crashing.
const NOOP_COMPARE: CompareContextValue = {
  ids: [],
  toggle: () => {},
  remove: () => {},
  clear: () => {},
  isSelected: () => false,
  count: 0,
}

function readStoredIds(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(COMPARE_STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : []
  } catch {
    return []
  }
}

/**
 * UI-only "compare tray" context: which product ids are selected for
 * side-by-side comparison (max `COMPARE_MAX`). Persisted to localStorage
 * (`_ck_compare`) so the selection survives navigation/reload — hydrated
 * from storage in a `useEffect` (not `useState`'s initializer) so the server
 * render and first client render both start empty and match; the real value
 * syncs in immediately after mount (SSR-guarded, no `window` access during
 * render).
 *
 * Not mounted globally yet (see T25 note in the plan) — `/compare` mounts
 * its own instance around the table, which works standalone because this
 * context always re-reads localStorage on mount regardless of where it's
 * placed in the tree.
 */
export function CompareProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setIds(readStoredIds())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    window.localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(ids))
  }, [ids, hydrated])

  const toggle = (id: string) => {
    setIds((current) => {
      if (current.includes(id)) {
        return current.filter((existing) => existing !== id)
      }
      if (current.length >= COMPARE_MAX) {
        toast.error("Compare is limited to 5 products")
        return current
      }
      return [...current, id]
    })
  }

  const remove = (id: string) => {
    setIds((current) => current.filter((existing) => existing !== id))
  }

  const clear = () => setIds([])

  const isSelected = (id: string) => ids.includes(id)

  return (
    <CompareContext.Provider
      value={{ ids, toggle, remove, clear, isSelected, count: ids.length }}
    >
      {children}
    </CompareContext.Provider>
  )
}

/**
 * Reads/controls the compare tray. Safe to call from anywhere — returns the
 * no-op fallback (empty selection, inert mutators) when rendered outside
 * `CompareProvider` instead of throwing.
 */
export function useCompare(): CompareContextValue {
  const ctx = useContext(CompareContext)
  return ctx ?? NOOP_COMPARE
}
