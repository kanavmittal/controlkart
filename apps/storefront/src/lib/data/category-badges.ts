import { listCategories } from "./categories"
import { deriveMarketingBadges, type ProductBadge } from "@/components/shared/product-badges"

/** One cached category read for each group of homepage tiles; omit badges on failure. */
export async function getCategoryBadges(): Promise<Record<string, ProductBadge[]>> {
  const categories = await listCategories().catch(() => [])
  return Object.fromEntries(categories.map((category) => [
    `/categories/${category.handle}`, deriveMarketingBadges(category.metadata),
  ]))
}
