import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { IProductModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { mergeBadgeSettings, parseBadgeSettings, readBadgeSettings } from "./storefront-badges"

/** Admin routes inherit Medusa's /admin authentication. Always merge on the server. */
export function badgeRoute(kind: "product" | "category") {
  return async (req: MedusaRequest, res: MedusaResponse) => {
    let settings: ReturnType<typeof parseBadgeSettings> | undefined
    if (req.method === "POST") {
      try { settings = parseBadgeSettings(req.body) }
      catch (error) { res.status(400).json({ message: (error as Error).message }); return }
    }
    const service: IProductModuleService = req.scope.resolve(Modules.PRODUCT)
    const entity = kind === "product"
      ? await service.retrieveProduct(req.params.id, { select: ["id", "metadata"] })
      : await service.retrieveProductCategory(req.params.id, { select: ["id", "metadata"] })
    if (!settings) { res.json(readBadgeSettings(entity.metadata)); return }
    const metadata = mergeBadgeSettings(entity.metadata, settings)
    if (kind === "product") await service.updateProducts(entity.id, { metadata })
    else await service.updateProductCategories(entity.id, { metadata })
    res.json(settings)
  }
}
