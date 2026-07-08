import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

import { ProductGrid } from "./product-grid"

export interface ProductGridSkeletonProps {
  /** Number of card placeholders to render. */
  count?: number
  columns?: 3 | 4
  className?: string
}

/**
 * Loading placeholder for `ProductGrid` — reuses the same grid so column
 * counts/breakpoints never drift from the real thing, filled with `count`
 * card-shaped skeletons that mirror `ProductCard`'s shell
 * (`rounded-[var(--radius)] border border-border bg-white p-4`): a square
 * media block, two title lines, a price line, and a footer button block.
 */
export function ProductGridSkeleton({
  count = 8,
  columns = 4,
  className,
}: ProductGridSkeletonProps) {
  return (
    <ProductGrid columns={columns} className={className}>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className={cn(
            "flex flex-col gap-4 rounded-[var(--radius)] border border-border bg-white p-4"
          )}
        >
          <Skeleton className="aspect-square w-full rounded-[calc(var(--radius)-2px)]" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-1/3" />
          </div>
          <Skeleton className="h-9 w-full rounded-[var(--radius-button)]" />
        </div>
      ))}
    </ProductGrid>
  )
}
