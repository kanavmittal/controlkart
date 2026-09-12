import type { ExecArgs, IStoreModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { readBrandProfiles, upsertBrandProfile, brandKey } from "../utils/brand-directory"

/** Idempotent initial artwork. Future changes are managed in Admin → Brands. */
export default async function setupBrandAssets({ container }: ExecArgs) {
  const service: IStoreModuleService = container.resolve(Modules.STORE)
  const [store] = await service.listStores({}, { take: 1 })
  if (!store) throw new Error("Create a store before setting up brands")
  if (readBrandProfiles(store.metadata).some((brand) => brandKey(brand.name) === "selec")) {
    console.log("Selec brand profile already exists; preserved existing settings")
    return
  }
  await service.updateStores(store.id, { metadata: upsertBrandProfile(store.metadata, {
    name: "Selec", logo_url: "/static/brands/selec-logo.png", cover_url: "/static/brands/selec-cover.jpg",
    description: "Industrial automation, electrical measurement, monitoring and control components.", enabled: true,
  }) })
  console.log("Saved Selec logo and cover in the Medusa brand directory")
}
