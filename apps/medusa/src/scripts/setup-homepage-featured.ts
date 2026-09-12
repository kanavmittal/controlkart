import type { ExecArgs, IProductModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

/** Creates the editable homepage list once, preserving subsequent admin edits. */
export default async function setupHomepageFeatured({ container }: ExecArgs) {
  const products: IProductModuleService = container.resolve(Modules.PRODUCT)
  const existing = await products.listProductCollections({ handle: "homepage-featured" })
  if (existing.length) {
    console.log("Homepage featured collection already exists; preserved selection")
    return
  }
  const collection = await products.createProductCollections({ title: "Homepage Featured Products", handle: "homepage-featured" })
  const initial = await products.listProducts({ status: "published" }, { take: 8, order: { created_at: "ASC" } })
  for (const product of initial.filter((product) => !product.collection_id)) {
    await products.updateProducts(product.id, { collection_id: collection.id })
  }
  console.log("Created Homepage Featured Products. Manage selection in Admin → Products → Collections.")
}
