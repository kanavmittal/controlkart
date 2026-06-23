"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { sdk } from "@/lib/sdk"
import { queryKeys } from "@/lib/query-keys"

/** Below-the-fold CSR: product categories grid for the homepage. */
export function HomeCategories() {
  const { data: categories = [], isLoading } = useQuery({
    queryKey: queryKeys.homeCategories,
    queryFn: async () => {
      const { product_categories } = await sdk.store.category.list({
        fields: "id,name,handle,description,parent_category_id",
        limit: 200,
      })
      // Top-level only — sub-categories surface inside their parent's page.
      return product_categories.filter((c) => !c.parent_category_id)
    },
    staleTime: 5 * 60_000,
  })

  if (isLoading) {
    return (
      <div className="mt-8 grid grid-cols-2 gap-px border border-[var(--color-line)] bg-[var(--color-line)] md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-[var(--color-surface)] p-6">
            <div className="h-4 w-24 animate-pulse rounded bg-[var(--color-surface-alt)]" />
            <div className="mt-2 h-3 w-32 animate-pulse rounded bg-[var(--color-surface-alt)]" />
          </div>
        ))}
      </div>
    )
  }

  if (!categories.length) return null

  return (
    <div className="mt-8 grid grid-cols-2 gap-px border border-[var(--color-line)] bg-[var(--color-line)] md:grid-cols-4">
      {categories.map((cat) => (
        <Link
          key={cat.id}
          href={`/categories/${cat.handle}`}
          className="group bg-[var(--color-surface)] p-6 hover:bg-[var(--color-surface-alt)]"
        >
          <h3 className="text-sm font-semibold group-hover:text-[var(--color-accent)]">
            {cat.name}
          </h3>
          <p className="mt-1 line-clamp-2 text-xs text-[var(--color-ink-muted)]">
            {cat.description || "Browse range"}
          </p>
        </Link>
      ))}
    </div>
  )
}
