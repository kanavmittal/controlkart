import Medusa from "@medusajs/js-sdk"

/**
 * Browser-side Medusa SDK singleton.
 *
 * Phase 2: `auth: { type: "jwt", jwtTokenStorageMethod: "local" }` makes the SDK
 * store the customer JWT in localStorage and auto-attach it to authenticated
 * calls (customer, orders, addresses). Cart is public (publishable key only);
 * the cart id is kept in localStorage (see cart-store.ts).
 *
 * Reference NEXT_PUBLIC_* directly (inlined at build) so nothing server-only
 * leaks into the client bundle.
 */
export const sdk = new Medusa({
  baseUrl:
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000",
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "",
  auth: { type: "jwt", jwtTokenStorageMethod: "local" },
})

/** Cart fields for the client cart query (mirrors the old server CART_FIELDS). */
export const CART_FIELDS =
  "*items,*items.variant,*items.variant.product,*shipping_methods,*shipping_address,*billing_address,*payment_collection,*payment_collection.payment_sessions"

/**
 * Card fields for the home featured grid — mirrors the server `PRODUCT_FIELDS`
 * (apps/storefront/src/lib/data/products.ts) trimmed to what ProductCard needs.
 */
export const PRODUCT_FIELDS_CLIENT =
  "id,title,subtitle,handle,thumbnail,metadata,*variants,+variants.inventory_quantity,*variants.calculated_price"

/**
 * Fields for the live PDP price/stock query (staleTime 0).
 * NOTE: must EXPAND `*variants` — restricting to `variants.id,variants.sku`
 * prunes the data Medusa needs to compute `inventory_quantity`, which then
 * comes back null. `*variants` also brings manage_inventory + allow_backorder.
 */
export const PRODUCT_LIVE_FIELDS =
  "id,*variants,+variants.inventory_quantity,*variants.calculated_price"
