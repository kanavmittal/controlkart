import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { IProductModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows"
export const POST = async (req: MedusaRequest<{ brand: string }>, res: MedusaResponse) => {
  if (typeof req.body?.brand !== "string" || req.body.brand.trim().length > 80) {
    res.status(400).json({ message: "Brand must be at most 80 characters" }); return
  }
  const service: IProductModuleService = req.scope.resolve(Modules.PRODUCT)
  const product = await service.retrieveProduct(req.params.id, { select: ["id", "metadata"] })
  const brand = req.body.brand.trim()
  await updateProductsWorkflow(req.scope).run({ input: { products: [{ id: product.id, metadata: { ...product.metadata, brand: brand || null } }] } })
  res.json({ brand })
}
