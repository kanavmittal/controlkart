import { ProductGridSkeleton } from "@/components/product/product-grid-skeleton"
import { Skeleton } from "@/components/ui/skeleton"

// Route loading state for `/categories/[handle]` — mirrors the page's
// `.athens-container` shell with a breadcrumb/title placeholder above a
// matching `ProductGridSkeleton`, so nothing shifts once data streams in.
export default function CategoryLoading() {
  return (
    <div className="athens-container py-8">
      <Skeleton className="h-4 w-40" />
      <div className="mt-4 flex flex-col gap-3">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="mt-8">
        <ProductGridSkeleton />
      </div>
    </div>
  )
}
