import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { IStoreModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { parseBrandProfile, upsertBrandProfile } from "../../../utils/brand-directory"
import { loadBrands } from "../../../utils/load-brands"
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  res.json({ brands: await loadBrands(req.scope, true) })
}
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  let profile: ReturnType<typeof parseBrandProfile>
  try { profile = parseBrandProfile(req.body) }
  catch (error) { res.status(400).json({ message: (error as Error).message }); return }
  const service: IStoreModuleService = req.scope.resolve(Modules.STORE)
  const [store] = await service.listStores({}, { take: 1 })
  if (!store) { res.status(404).json({ message: "Store not found" }); return }
  await service.updateStores(store.id, { metadata: upsertBrandProfile(store.metadata, profile) })
  res.json({ brand: profile })
}
