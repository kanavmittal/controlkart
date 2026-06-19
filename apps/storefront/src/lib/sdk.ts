import Medusa from "@medusajs/js-sdk"

/**
 * Browser-side Medusa SDK singleton.
 *
 * Phase 1 uses this for PUBLIC product data only (price/stock, recommendations,
 * region) with the publishable key — no auth token, no cart id. Auth and cart
 * stay server-side (httpOnly cookies + server actions) until Phase 2, which will
 * add `auth: { type: "jwt" }` here for client-side cart/customer.
 *
 * Reference NEXT_PUBLIC_* directly (inlined at build) so nothing server-only
 * leaks into the client bundle.
 */
export const sdk = new Medusa({
  baseUrl:
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000",
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "",
})

/**
 * Card fields for the home featured grid — mirrors the server `PRODUCT_FIELDS`
 * (apps/storefront/src/lib/data/products.ts) trimmed to what ProductCard needs.
 */
export const PRODUCT_FIELDS_CLIENT =
  "id,title,subtitle,handle,thumbnail,metadata,*variants,+variants.inventory_quantity,*variants.calculated_price"

/** Minimal fields for the live PDP price/stock query (staleTime 0). */
export const PRODUCT_LIVE_FIELDS =
  "id,variants.id,variants.sku,+variants.inventory_quantity,*variants.calculated_price"
