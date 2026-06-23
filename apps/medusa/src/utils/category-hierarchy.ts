import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

type QueryGraph = {
  graph: (config: {
    entity: string
    fields: string[]
    filters?: Record<string, unknown>
  }) => Promise<{ data: Array<Record<string, unknown>> }>
}

export type CategoryLineage = {
  /** the input category ids (a product's / a category's own categories) */
  ownIds: string[]
  /** every ancestor id across all input categories (excludes own) */
  ancestorIds: string[]
  /** own + ancestors, deduped — the full set whose spec templates apply */
  allIds: string[]
  /** id -> name for every category in `allIds`, for labelling inherited specs */
  names: Map<string, string>
}

/**
 * Resolves the full category lineage (self + all ancestors) for a set of
 * categories using Medusa's `mpath` materialized path. `mpath` is a
 * dot-separated chain of category ids ending in the category's own id
 * (`"${parent.mpath}.${self.id}"`), so a single read yields the whole ancestor
 * chain at any depth. This is what makes spec templates inherit down the tree:
 * a product in "Wall-mounted PLCs" picks up the templates of "PLCs" above it.
 */
export async function resolveCategoryLineage(
  query: QueryGraph,
  categoryIds: string[]
): Promise<CategoryLineage> {
  const ownIds = [...new Set(categoryIds.filter(Boolean))]
  if (!ownIds.length) {
    return { ownIds: [], ancestorIds: [], allIds: [], names: new Map() }
  }

  const { data: categories } = await query.graph({
    entity: "product_category",
    fields: ["id", "mpath"],
    filters: { id: ownIds },
  })

  const allIds = new Set<string>()
  for (const cat of categories) {
    const mpath = (cat.mpath as string | null) ?? ""
    for (const id of mpath.split(".")) {
      if (id) {
        allIds.add(id)
      }
    }
    // Defensive: ensure the category's own id is included even if mpath is empty.
    allIds.add(cat.id as string)
  }

  const ownSet = new Set(ownIds)
  const ancestorIds = [...allIds].filter((id) => !ownSet.has(id))

  const { data: named } = await query.graph({
    entity: "product_category",
    fields: ["id", "name"],
    filters: { id: [...allIds] },
  })
  const names = new Map<string, string>(
    named.map((c) => [c.id as string, c.name as string])
  )

  return {
    ownIds,
    ancestorIds,
    allIds: [...allIds],
    names,
  }
}

/** Convenience resolver from an already-resolved query container key. */
export function getQuery(scope: {
  resolve: (key: string) => unknown
}): QueryGraph {
  return scope.resolve(ContainerRegistrationKeys.QUERY) as QueryGraph
}
