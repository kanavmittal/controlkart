import type { HttpTypes } from "@medusajs/types"

interface ProductSummaryProps {
  product: HttpTypes.StoreProduct
}

/**
 * Server-rendered top of the PDP buy column: vendor line, H1 title, SKU/MPN
 * line. Ported from the clone's `app/products/[handle]/page.tsx` right
 * column (`product.vendor` paragraph / `h1` / "SKU: ..." line) using this
 * store's metadata conventions in place of the clone's static catalog
 * fields: `metadata.brand` for vendor, `metadata.mpn` (falling back to the
 * first variant's SKU, same fallback `quick-view-dialog.tsx` uses) for the
 * SKU/MPN line. No client state — `buy-box.tsx` owns everything that reacts
 * to the selected variant.
 */
export function ProductSummary({ product }: ProductSummaryProps) {
  const brand = product.metadata?.brand as string | undefined
  const variants = product.variants ?? []
  const mpn = (product.metadata?.mpn as string | undefined) || variants[0]?.sku

  return (
    <div>
      {brand ? (
        <p className="mb-1 text-[13px] text-[var(--color-athens-body)]">{brand}</p>
      ) : null}
      <h1 className="text-[24px] leading-[1.3] font-medium text-[var(--color-athens-dark)]">
        {product.title}
      </h1>
      {mpn ? (
        <p className="mt-2 text-[13px] text-[var(--color-athens-body)]">SKU: {mpn}</p>
      ) : null}
    </div>
  )
}
