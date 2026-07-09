import Link from "next/link"
import type { HttpTypes } from "@medusajs/types"

interface ProductSummaryProps {
  product: HttpTypes.StoreProduct
}

/**
 * Server-rendered top of the PDP buy column, Athens `product-info` blocks
 * 1-3: eyebrow (vendor as a small link to `/brands`) / H1 title / SKU line /
 * hairline divider. Ported from the clone's
 * `app/products/[handle]/page.tsx` right column using this store's metadata
 * conventions in place of the clone's static catalog fields:
 * `metadata.brand` for the eyebrow (clone renders vendor as plain text; ours
 * links to `/brands` per the post-review fix — brand is a
 * `product.metadata.brand` string, not a facet endpoint, same "link to a
 * search/browse surface" pattern as `megaMenuBrands`/`/brands`),
 * `metadata.mpn` (falling back to the first variant's SKU, same fallback
 * `quick-view-dialog.tsx` uses) for the SKU/MPN line. No rating stars
 * (omitted storewide per plan decision #2). No client state — `buy-box.tsx`
 * owns everything that reacts to the selected variant, starting at the
 * price block below this divider.
 */
export function ProductSummary({ product }: ProductSummaryProps) {
  const brand = product.metadata?.brand as string | undefined
  const variants = product.variants ?? []
  const mpn = (product.metadata?.mpn as string | undefined) || variants[0]?.sku

  return (
    <div>
      {brand ? (
        <Link
          href="/brands"
          className="mb-1 inline-block text-[13px] text-[var(--color-athens-body)] hover:text-[var(--color-athens-dark)] hover:underline"
        >
          {brand}
        </Link>
      ) : null}
      <h1 className="athens-section-heading">
        {product.title}
      </h1>
      {mpn ? (
        <p className="mt-2 text-[13px] text-[var(--color-athens-body)]">SKU: {mpn}</p>
      ) : null}
      <hr className="my-5 border-0 border-t border-[var(--color-athens-line)]" />
    </div>
  )
}
