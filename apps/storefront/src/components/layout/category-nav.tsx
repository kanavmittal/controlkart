"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { sdk } from "@/lib/sdk"

type Cat = { id: string; name: string; handle: string }
type Tree = Cat & {
  parent_category_id?: string | null
  category_children?: Cat[] | null
}

/**
 * Header "Products" entry with a hover dropdown of top-level categories and
 * their sub-categories. Data-driven (CSR) so the rest of the header stays
 * static; falls back to a plain link while loading or if the fetch fails.
 */
export function CategoryNav() {
  const { data: roots = [] } = useQuery({
    queryKey: ["category-nav"],
    queryFn: async () => {
      const { product_categories } = await sdk.store.category.list({
        fields:
          "id,name,handle,parent_category_id,category_children.id,category_children.name,category_children.handle",
        limit: 200,
      })
      return (product_categories as Tree[]).filter(
        (c) => !c.parent_category_id
      )
    },
    staleTime: 5 * 60_000,
  })

  return (
    <div className="group relative">
      <Link
        href="/products"
        className="inline-flex items-center gap-1 hover:text-[var(--color-accent)]"
      >
        Products
        <span aria-hidden className="text-[10px]">
          ▾
        </span>
      </Link>

      {roots.length > 0 && (
        <div className="invisible absolute left-1/2 top-full z-50 w-[34rem] -translate-x-1/2 pt-3 opacity-0 transition-opacity group-hover:visible group-hover:opacity-100">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 border border-[var(--color-line)] bg-[var(--color-surface)] p-5 shadow-lg">
            {roots.map((root) => (
              <div key={root.id}>
                <Link
                  href={`/categories/${root.handle}`}
                  className="text-sm font-semibold hover:text-[var(--color-accent)]"
                >
                  {root.name}
                </Link>
                {root.category_children &&
                  root.category_children.length > 0 && (
                    <ul className="mt-1.5 flex flex-col gap-1">
                      {root.category_children.map((child) => (
                        <li key={child.id}>
                          <Link
                            href={`/categories/${child.handle}`}
                            className="text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-accent)]"
                          >
                            {child.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
