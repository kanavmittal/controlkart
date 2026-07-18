/**
 * Category-handle matching, kept dependency-free so it is trivially unit-testable
 * (see category-handle.test.ts).
 *
 * Why this exists: Medusa's `?handle=` filter is CASE-SENSITIVE, and category
 * handles created in the admin can contain uppercase and underscores
 * (e.g. "single_phase_Input"). A URL whose casing doesn't byte-match the stored
 * handle — a lowercased SEO/canonical link, a shared link, a hand-typed URL —
 * then resolves to nothing and the page 404s ("Category Not Found"). Resolving
 * case-insensitively makes every category reachable regardless of handle casing.
 */

/** Normalize a handle for tolerant comparison (case-insensitive, trimmed). */
export function normalizeHandle(handle: string | null | undefined): string {
  return (handle ?? "").trim().toLowerCase()
}

/**
 * Find the category whose handle matches `target`. An exact (byte-for-byte)
 * match always wins; otherwise fall back to a case-insensitive / trimmed match.
 * Returns the matched category (carrying its canonical stored handle) or null.
 */
export function matchCategoryHandle<T extends { handle?: string | null }>(
  categories: readonly T[],
  target: string | null | undefined
): T | null {
  if (!target) return null
  const exact = categories.find((c) => c.handle === target)
  if (exact) return exact
  const wanted = normalizeHandle(target)
  if (!wanted) return null
  return categories.find((c) => normalizeHandle(c.handle) === wanted) ?? null
}
