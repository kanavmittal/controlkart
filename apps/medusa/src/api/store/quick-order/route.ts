import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * Resolves a list of SKUs to purchasable variants for the quick-order form.
 * GET /store/quick-order?skus=SKU1,SKU2
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const skus = ((req.query.skus as string) || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)

  if (!skus.length) {
    res.json({ results: [] })
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: variants } = await query.graph({
    entity: "variant",
    fields: [
      "id",
      "sku",
      "title",
      "product.id",
      "product.title",
      "product.handle",
      "product.thumbnail",
    ],
    filters: { sku: skus },
  })

  const bySku = new Map(variants.map((v: any) => [v.sku, v]))
  res.json({
    results: skus.map((sku) => ({
      sku,
      found: bySku.has(sku),
      variant: bySku.get(sku) ?? null,
    })),
  })
}
