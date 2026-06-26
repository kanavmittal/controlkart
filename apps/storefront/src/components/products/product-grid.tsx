import type { ReactNode } from "react"

const COLS = {
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
} as const

/**
 * Seamless hairline product grid.
 *
 * The container draws only the left+top hairline; each *real* child draws its
 * right+bottom hairline. Empty cells in a partial last row have no child, so
 * nothing is drawn there and the white page shows through — fixing the old
 * `gap-px + bg-[var(--color-line)]` pattern that leaked gray into empty cells.
 * Children must therefore carry no border of their own (avoids double lines).
 */
export function ProductGrid({
  cols = 3,
  className = "",
  children,
}: {
  cols?: 3 | 4
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={`grid ${COLS[cols]} border-l border-t border-[var(--color-line)] [&>*]:border-r [&>*]:border-b [&>*]:border-[var(--color-line)] ${className}`}
    >
      {children}
    </div>
  )
}
