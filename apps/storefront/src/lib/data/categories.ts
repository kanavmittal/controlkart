import { HttpTypes } from "@medusajs/types"
import { storeFetch } from "../medusa"
import type { SpecFacetsResponse } from "./types"

export type StoreCategory = HttpTypes.StoreProductCategory

/** Fields needed to render the category hierarchy (parent + nested children). */
const CATEGORY_TREE_FIELDS =
  "id,name,handle,description,parent_category_id,category_children.id,category_children.name,category_children.handle"

export async function listCategories() {
  const { product_categories } = await storeFetch<{
    product_categories: StoreCategory[]
  }>("/store/product-categories", {
    query: { fields: CATEGORY_TREE_FIELDS, limit: 200 },
    revalidate: 300,
    tags: ["categories"],
  })
  return product_categories
}

/** Only top-level categories (no parent) — for the home grid and nav roots. */
export async function listTopLevelCategories() {
  const all = await listCategories()
  return all.filter((c) => !c.parent_category_id)
}

/**
 * Top-level categories with their immediate children attached, built from a
 * single flat fetch. Used by the header nav and the /products category filter.
 */
export async function getCategoryTree(): Promise<
  (StoreCategory & { children: StoreCategory[] })[]
> {
  const all = await listCategories()
  const byParent = new Map<string, StoreCategory[]>()
  for (const c of all) {
    if (c.parent_category_id) {
      const list = byParent.get(c.parent_category_id) ?? []
      list.push(c)
      byParent.set(c.parent_category_id, list)
    }
  }
  return all
    .filter((c) => !c.parent_category_id)
    .map((c) => ({ ...c, children: byParent.get(c.id) ?? [] }))
}

export async function getCategoryByHandle(handle: string) {
  const { product_categories } = await storeFetch<{
    product_categories: StoreCategory[]
  }>("/store/product-categories", {
    query: {
      handle,
      fields:
        CATEGORY_TREE_FIELDS +
        ",parent_category.id,parent_category.name,parent_category.handle",
      include_descendants_tree: "true",
    },
    revalidate: 300,
    tags: ["categories"],
  })
  return product_categories[0] ?? null
}

/** Flattens a category's nested `category_children` tree into a flat list. */
export function flattenDescendants(category: StoreCategory): StoreCategory[] {
  const out: StoreCategory[] = []
  const walk = (children?: StoreCategory[] | null) => {
    for (const child of children ?? []) {
      out.push(child)
      walk(child.category_children)
    }
  }
  walk(category.category_children)
  return out
}

/**
 * Spec facets for a category and its descendants, plus the product ids matching
 * the selected filters (sorted when `sort` is given). `selected` maps an
 * attribute code to chosen exact values; `sort` is `<attribute_code>:asc|desc`.
 */
export async function getCategorySpecFacets(
  categoryId: string,
  selected: Record<string, string[]> = {},
  sort?: string
): Promise<SpecFacetsResponse> {
  return storeFetch<SpecFacetsResponse>(
    `/store/categories/${categoryId}/spec-facets`,
    {
      query: { filters: JSON.stringify(selected), sort },
      tags: ["products", "specs"],
    }
  )
}
