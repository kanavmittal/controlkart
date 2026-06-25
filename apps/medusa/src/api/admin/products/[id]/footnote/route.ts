import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import type { IProductModuleService } from "@medusajs/framework/types"

type FootnoteBody = { footnote?: string }

/**
 * Sets the product's `metadata.footnote` (a short storefront note, e.g. "v2
 * coming soon"). Merges server-side because the product module replaces the
 * whole metadata object on update — a naive write would wipe brand/mpn/hsn.
 * An empty footnote removes the key.
 */
export const POST = async (
  req: MedusaRequest<FootnoteBody>,
  res: MedusaResponse
) => {
  const productService: IProductModuleService = req.scope.resolve(
    Modules.PRODUCT
  )
  const id = req.params.id

  const product = await productService.retrieveProduct(id, {
    select: ["id", "metadata"],
  })
  const current = (product.metadata ?? {}) as Record<string, unknown>

  const footnote = (req.body.footnote ?? "").trim()
  const next: Record<string, unknown> = { ...current }
  if (footnote) {
    next.footnote = footnote
  } else {
    delete next.footnote
  }

  const updated = await productService.updateProducts(id, { metadata: next })
  res.json({
    footnote: (updated.metadata?.footnote as string) ?? "",
    metadata: updated.metadata,
  })
}
