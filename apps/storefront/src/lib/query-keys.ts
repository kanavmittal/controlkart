/**
 * Shared TanStack Query options for highly-dynamic data (price, stock, and — in
 * Phase 2 — the cart): always treated as stale so the UI shows fresh values.
 * This is the guide's "override staleTime to 0 for dynamic data".
 */
export const DYNAMIC_QUERY_OPTIONS = {
  staleTime: 0,
  refetchOnMount: "always",
  refetchOnWindowFocus: true,
} as const

/** Central query-key registry — keeps invalidation correct and collision-free. */
export const queryKeys = {
  region: ["region"] as const,
  productLive: (productId: string, regionId?: string) =>
    ["product-live", productId, regionId] as const,
  homeFeatured: (regionId?: string) => ["home", "featured", regionId] as const,
  homeCategories: ["home", "categories"] as const,
  homePosts: ["home", "posts"] as const,
  // Reserved for Phase 2: cart, customer.
}
