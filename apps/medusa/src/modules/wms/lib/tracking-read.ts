/**
 * Read-only adapter over the Shiprocket plugin's own tracking module
 * (`@sam-ael/medusa-plugin-shiprocket`'s `shiprocket-tracking` module,
 * confirmed at
 * `node_modules/@sam-ael/medusa-plugin-shiprocket/.medusa/server/src/modules/shiprocket-tracking`).
 *
 * That module stores webhook-fed delivery scans (see
 * `docs/shiprocket-webhook.md` for the inbound webhook contract) and is
 * registered automatically — via `Module(SHIPROCKET_TRACKING_MODULE, ...)`
 * inside the plugin package — whenever the plugin is present in
 * medusa-config.ts's `plugins` array (gated on `SHIPROCKET_EMAIL`, same as
 * the fulfillment provider; see medusa-config.ts). The plugin ships no
 * `.d.ts` files and doesn't export its module registration key as a public
 * import, so — mirroring the plugin's own internal routes, which each
 * redeclare the same literal — we hardcode the key here rather than
 * importing it.
 *
 * HARD RULE: this file only ever *reads* from the plugin's tracking module
 * (`findByAwb`). It never writes to the plugin's tables (that's the
 * webhook route's and the plugin's own admin sync route's job) and never
 * mutates wms `shipment` rows — callers are expected to map tracking onto
 * their own status lazily, on read.
 */

import type { MedusaContainer } from "@medusajs/framework/types"

/** Registration key the plugin's `Module(...)` call uses for its tracking
 * service (`.medusa/server/src/modules/shiprocket-tracking/index.js`):
 * `exports.SHIPROCKET_TRACKING_MODULE = "shiprocketTrackingModuleService"`. */
export const SHIPROCKET_TRACKING_MODULE = "shiprocketTrackingModuleService"

/**
 * Loose shape of a row from the plugin's `shiprocket_tracking` table
 * (`.medusa/server/src/modules/shiprocket-tracking/models/tracking.ts`).
 * Only the fields this adapter (and its callers) actually use are typed
 * explicitly; everything else the plugin stores passes through via the
 * index signature since the plugin ships no `.d.ts`.
 */
export interface ShiprocketTrackingRow {
  id: string
  awb: string
  current_status: string | null
  shipment_status: string | null
  courier_name?: string | null
  etd?: string | Date | null
  [key: string]: unknown
}

/** Minimal shape of the plugin's tracking module service this adapter
 * depends on — kept local (rather than importing the plugin's own,
 * type-less class) so this file's dependency surface is explicit. */
interface ShiprocketTrackingServiceLike {
  findByAwb(awb: string): Promise<ShiprocketTrackingRow | null>
}

/**
 * Resolves the plugin's tracking module from the container and returns the
 * tracking row for `shipment.awb`, or `null` when:
 *  - the shipment has no AWB yet,
 *  - the plugin's tracking module isn't registered in this container
 *    (e.g. `SHIPROCKET_EMAIL` unset locally, so the `plugins` array entry —
 *    and everything it registers, including this module — was skipped),
 *  - no row exists for that AWB (webhook hasn't fired yet), or
 *  - the lookup itself fails for any other reason.
 *
 * This function degrades gracefully in every case above — it never throws.
 * Read-side "tracking not available yet" is an expected, common state
 * (e.g. between AWB assignment and the first webhook scan), not an error.
 */
export async function getTrackingForShipment(
  container: MedusaContainer,
  shipment: { awb: string | null }
): Promise<ShiprocketTrackingRow | null> {
  if (!shipment.awb) {
    return null
  }

  let trackingService: ShiprocketTrackingServiceLike
  try {
    trackingService = container.resolve(SHIPROCKET_TRACKING_MODULE)
  } catch {
    // Module not registered in this container — plugin not loaded.
    return null
  }

  try {
    const row = await trackingService.findByAwb(shipment.awb)
    return row ?? null
  } catch {
    // Never throw on the read side; treat lookup failures as "no tracking
    // available yet" rather than surfacing them to callers.
    return null
  }
}

/** Coarse, wms-friendly tracking buckets. Not exhaustive of every
 * Shiprocket status string — deliberately coarse so callers (print queue,
 * shipment list, etc.) don't need to know Shiprocket's status vocabulary. */
export type WmsTrackingBucket =
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "rto"
  | "cancelled"
  | "exception"

/**
 * Maps a plugin tracking row onto a coarse wms status bucket, or `null`
 * when there's no row or its status doesn't match a known bucket.
 *
 * Bucket membership is derived from the plugin's own status vocabulary,
 * found in its source:
 *  - Admin widget's `humanizeStatus` dictionary
 *    (`.medusa/server/src/admin/index.js`) — the values `current_status`
 *    holds once the webhook route's raw Shiprocket payload has flowed
 *    through: `READYFORRECEIVE`, `PICKUPCANCELLED`, `OUTFORPICKUP`,
 *    `PICKUPGENERATED`, `PICKUPSCHEDULED`, `PICKUPQUEUED`,
 *    `PICKUPRESCHEDULED`, `PICKUPPICKEDUP`, `AWBASSIGNED`,
 *    `LABELGENERATED`, `MANIFESTGENERATED`, `INTRANSIT`, `OUTFORDELIVERY`,
 *    `DELIVERED`, `CANCELLED`, `RTOINITIATED`, `RTODELIVERED`,
 *    `RTOACKNOWLEDGED`, `LOST`, `DAMAGED`, `DESTROYED`, `DISPOSEOFF`.
 *  - The admin tracking-sync route's numeric `statusMap`
 *    (`.medusa/server/src/api/admin/shiprocket/tracking/[awb]/sync/route.ts`),
 *    which additionally surfaces `"Shipped"` and `"Reached Destination"`.
 *
 * Matching is done on an alpha-only, uppercased normalization of
 * `current_status` (falling back to `shipment_status`) so it's resilient
 * to the plugin's status strings sometimes carrying spaces (e.g.
 * `"Shipped"`) and sometimes not (e.g. `"INTRANSIT"`).
 */
export function mapTrackingToStatus(
  row: ShiprocketTrackingRow | null
): string | null {
  if (!row) {
    return null
  }

  const raw = row.current_status ?? row.shipment_status
  if (!raw || typeof raw !== "string") {
    return null
  }

  const s = raw.toUpperCase().replace(/[^A-Z]/g, "")

  // Order matters: check the more specific RTO/out-for-delivery buckets
  // before the broader "DELIVER"/"TRANSIT" checks they'd otherwise also
  // match (e.g. RTODELIVERED contains "DELIVER").
  if (s.includes("RTO") || s.includes("RETURN")) {
    return "rto" satisfies WmsTrackingBucket
  }

  if (s.includes("OUTFORDELIVERY")) {
    return "out_for_delivery" satisfies WmsTrackingBucket
  }

  if (s.includes("DELIVER")) {
    return "delivered" satisfies WmsTrackingBucket
  }

  if (s.includes("CANCEL")) {
    return "cancelled" satisfies WmsTrackingBucket
  }

  if (
    s.includes("LOST") ||
    s.includes("DAMAGED") ||
    s.includes("DESTROYED") ||
    s.includes("DISPOSE") ||
    s.includes("ERROR") ||
    s.includes("EXCEPTION")
  ) {
    return "exception" satisfies WmsTrackingBucket
  }

  if (
    s.includes("TRANSIT") ||
    s.includes("SHIPPED") ||
    s.includes("PICKUP") ||
    s.includes("PICKED") ||
    s.includes("AWBASSIGNED") ||
    s.includes("LABELGENERATED") ||
    s.includes("MANIFESTGENERATED") ||
    s.includes("READYFORRECEIVE") ||
    s.includes("REACHEDDESTINATION")
  ) {
    return "in_transit" satisfies WmsTrackingBucket
  }

  return null
}
