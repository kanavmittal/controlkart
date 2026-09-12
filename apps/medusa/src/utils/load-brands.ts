import type { MedusaContainer, IProductModuleService, IStoreModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { buildBrandDirectory, readBrandProfiles } from "./brand-directory"

export async function loadBrands(scope: MedusaContainer, admin = false) {
  const productService: IProductModuleService = scope.resolve(Modules.PRODUCT)
  const storeService: IStoreModuleService = scope.resolve(Modules.STORE)
  const [store] = await storeService.listStores({}, { take: 1 })
  const products: { metadata?: Record<string, unknown> | null }[] = []
  for (let skip = 0; ; skip += 500) {
    const batch = await productService.listProducts({ status: "published" }, { select: ["id", "metadata"], take: 500, skip, order: { id: "ASC" } })
    products.push(...batch)
    if (batch.length < 500) break
  }
  return buildBrandDirectory(products, readBrandProfiles(store?.metadata), admin)
}
