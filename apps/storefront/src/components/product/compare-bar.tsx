"use client"

import Image from "next/image"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { X } from "lucide-react"

import { sdk } from "@/lib/sdk"
import { Button } from "@/components/ui/button"
import { useCompare } from "./compare-context"

// Only what the tray's thumbnails need — deliberately smaller than
// `PRODUCT_FIELDS_CLIENT` (no variants/pricing) since this bar never shows
// price or stock; the full comparison lives on `/compare`.
const COMPARE_BAR_FIELDS = "id,title,thumbnail"

/**
 * Floating "compare tray" — fixed to the viewport bottom, visible once at
 * least one product is selected (`useCompare().count >= 1`). Self-contained:
 * fetches just enough product data (thumbnail/title) for the selected ids
 * itself rather than depending on callers to pass product objects down.
 *
 * Not mounted anywhere yet — integration onto category/products pages is a
 * later task (see T25 note in the plan).
 */
export function CompareBar() {
  const { ids, count, remove, clear } = useCompare()

  const { data: products } = useQuery({
    queryKey: ["compare-bar-products", ids],
    queryFn: async () => {
      const { products } = await sdk.store.product.list({
        id: ids,
        fields: COMPARE_BAR_FIELDS,
        limit: ids.length,
      })
      return products
    },
    enabled: ids.length > 0,
  })

  if (count === 0) return null

  const canCompare = count >= 2

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-athens-line)] bg-[var(--color-athens-dark)] text-white"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="athens-container flex flex-wrap items-center justify-between gap-3 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex shrink-0 -space-x-2">
            {ids.map((id) => {
              const product = products?.find((p) => p.id === id)
              return (
                <div
                  key={id}
                  className="relative size-10 shrink-0 overflow-hidden rounded-[var(--radius-button)] border-2 border-[var(--color-athens-dark)] bg-white"
                >
                  {product?.thumbnail ? (
                    <Image
                      src={product.thumbnail}
                      alt={product.title ?? ""}
                      fill
                      className="object-contain p-1"
                      sizes="40px"
                    />
                  ) : null}
                </div>
              )
            })}
          </div>
          <span className="truncate text-sm font-medium">
            {count} product{count === 1 ? "" : "s"} selected
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {!canCompare ? (
            <span className="hidden text-xs text-white/70 sm:inline">
              Select at least 2 to compare
            </span>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="border-white/30 bg-transparent text-white hover:border-white hover:bg-white/10"
            onClick={clear}
          >
            <X aria-hidden />
            Clear
          </Button>
          {canCompare ? (
            <Button variant="secondary" size="sm" render={<Link href="/compare" />}>
              Compare ({count})
            </Button>
          ) : (
            <Button type="button" variant="secondary" size="sm" disabled>
              Compare ({count})
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
