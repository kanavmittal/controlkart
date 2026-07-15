/**
 * Thin adapter over the Shiprocket fulfillment plugin
 * (`@sam-ael/medusa-plugin-shiprocket`, registered as fulfillment provider
 * "shiprocket" in medusa-config.ts) for the handful of carrier operations
 * wms needs to invoke OUTSIDE Medusa's fulfillment workflows. Fulfillment
 * creation/cancellation that flows through Medusa's own fulfillment
 * workflows already routes to the plugin's provider automatically — this
 * file only covers what those workflows don't: (re)scheduling a pickup,
 * cancelling a Shiprocket order directly, and (re)fetching a label URL.
 *
 * This is the ONLY file in wms allowed to know Shiprocket exists.
 * Downstream code (see H3/H7) must depend on `ShipmentCarrier`/
 * `CarrierError` from here, never on Shiprocket-specific types or on the
 * plugin package directly.
 *
 * We never hand-roll HTTP calls to Shiprocket ourselves — every method
 * below delegates to the plugin's own `ShiprocketClient`
 * (`@sam-ael/medusa-plugin-shiprocket/providers/shiprocket/client`), which
 * owns auth/token caching and the actual axios calls.
 */

/** Minimal shape of the plugin's internal client that this adapter depends
 * on. Keeping this local (instead of importing the plugin's own type)
 * decouples the adapter — and its tests — from the concrete Shiprocket
 * class; tests inject a mock that satisfies this shape. */
export interface ShiprocketClientLike {
  /** Cancels an order in Shiprocket. Idempotent: the plugin client treats
   * an already-cancelled order as success rather than throwing. */
  cancel(orderId: string): Promise<void>
  /** Requests pickup for a shipment. Returns `false` (does not throw) when
   * Shiprocket declines/errors — the plugin client only logs a warning,
   * since the AWB is already assigned by that point. */
  schedulePickup(shipmentId: string | number, date?: Date): Promise<boolean>
  /** (Re)generates a shipment label. Returns `""` (does not throw) when
   * Shiprocket fails to produce one. */
  generateLabel(fulfillment: { shipment_id: string | number }): Promise<string>
}

export type CarrierErrorCode = "AUTH_FAILED" | "REQUEST_FAILED" | "NOT_CONFIGURED"

/** Typed error surfaced by every `ShipmentCarrier` method. Wraps whatever
 * the underlying carrier (plugin client) threw, or synthesizes one when the
 * carrier reports failure without throwing (e.g. Shiprocket's `false`/`""`
 * "soft failure" returns). */
export class CarrierError extends Error {
  readonly code: CarrierErrorCode

  constructor(code: CarrierErrorCode, message: string) {
    super(message)
    this.name = "CarrierError"
    this.code = code
  }
}

export type SchedulePickupInput = {
  /** Shiprocket's shipment id (distinct from the Shiprocket order id). */
  shipmentId: string | number
  /** Defaults to "today" in the underlying client if omitted. */
  pickupDate?: Date
}

export type GetLabelInput = {
  shipmentId: string | number
}

/**
 * Carrier operations wms invokes directly, independent of which shipping
 * carrier backs them. Downstream code must depend on this interface, never
 * on Shiprocket-specific types — swapping carriers later means writing a
 * new adapter class, not touching call sites.
 */
export interface ShipmentCarrier {
  /** Requests pickup for a shipment. Resolves `true` on success; throws
   * `CarrierError` (code `REQUEST_FAILED`) if the carrier declines. */
  schedulePickup(input: SchedulePickupInput): Promise<boolean>
  /** Cancels a carrier order. */
  cancel(shiprocketOrderId: string): Promise<void>
  /** (Re)generates/fetches a label URL for a shipment — used to reprint
   * when a stored label URL has expired. */
  getLabel(input: GetLabelInput): Promise<string>
}

const NOT_CONFIGURED_MESSAGE =
  "Shiprocket carrier is not configured (missing SHIPROCKET_EMAIL / SHIPROCKET_PASSWORD)."

/** Narrows a caught value down to a `CarrierError`, mapping Shiprocket-
 * plugin `MedusaError`s (401 → AUTH_FAILED, everything else →
 * REQUEST_FAILED) and any other thrown value to REQUEST_FAILED. */
function toCarrierError(err: unknown, fallbackMessage: string): CarrierError {
  if (err instanceof CarrierError) {
    return err
  }

  if (isMedusaError(err)) {
    if (err.type === "unauthorized") {
      return new CarrierError("AUTH_FAILED", err.message)
    }
    return new CarrierError("REQUEST_FAILED", err.message)
  }

  const message = err instanceof Error ? err.message : fallbackMessage
  return new CarrierError("REQUEST_FAILED", message)
}

/** Duck-types `@medusajs/framework/utils`'s `MedusaError` (which the
 * plugin's `handleError` helper throws) without importing it, so this
 * module has no hard dependency on the framework error class shape beyond
 * `{ type, message }`. */
function isMedusaError(err: unknown): err is { type: string; message: string } {
  return (
    typeof err === "object" &&
    err !== null &&
    "__isMedusaError" in err &&
    (err as { __isMedusaError?: unknown }).__isMedusaError === true
  )
}

/**
 * Adapter over the Shiprocket plugin's client for the operations wms needs
 * outside Medusa's fulfillment workflows. The client is injected via the
 * constructor so tests never touch the network or the plugin package —
 * see `createShiprocketCarrier` for runtime wiring against the real client.
 */
export class ShiprocketCarrier implements ShipmentCarrier {
  private readonly client: ShiprocketClientLike | null

  constructor(client: ShiprocketClientLike | null) {
    this.client = client
  }

  async schedulePickup(input: SchedulePickupInput): Promise<boolean> {
    const client = this.requireClient()
    try {
      const scheduled = await client.schedulePickup(input.shipmentId, input.pickupDate)
      if (!scheduled) {
        throw new CarrierError(
          "REQUEST_FAILED",
          `Shiprocket declined to schedule pickup for shipment ${input.shipmentId}.`
        )
      }
      return scheduled
    } catch (err) {
      throw toCarrierError(err, `Failed to schedule pickup for shipment ${input.shipmentId}.`)
    }
  }

  async cancel(shiprocketOrderId: string): Promise<void> {
    const client = this.requireClient()
    try {
      await client.cancel(shiprocketOrderId)
    } catch (err) {
      throw toCarrierError(err, `Failed to cancel Shiprocket order ${shiprocketOrderId}.`)
    }
  }

  async getLabel(input: GetLabelInput): Promise<string> {
    const client = this.requireClient()
    try {
      const labelUrl = await client.generateLabel({ shipment_id: input.shipmentId })
      if (!labelUrl) {
        throw new CarrierError(
          "REQUEST_FAILED",
          `Shiprocket did not return a label URL for shipment ${input.shipmentId}.`
        )
      }
      return labelUrl
    } catch (err) {
      throw toCarrierError(err, `Failed to generate label for shipment ${input.shipmentId}.`)
    }
  }

  private requireClient(): ShiprocketClientLike {
    if (!this.client) {
      throw new CarrierError("NOT_CONFIGURED", NOT_CONFIGURED_MESSAGE)
    }
    return this.client
  }
}

/**
 * Runtime factory: builds a `ShiprocketCarrier` wired to the plugin's real
 * client, gated on the same env vars medusa-config.ts uses to register the
 * "shiprocket" fulfillment provider (`SHIPROCKET_EMAIL`/
 * `SHIPROCKET_PASSWORD`/`SHIPROCKET_PICKUP_LOCATION`). When credentials are
 * absent this still returns a `ShiprocketCarrier` (with a null client) so
 * callers can construct it unconditionally at startup — every method then
 * throws `CarrierError` (`NOT_CONFIGURED`) instead of the factory itself
 * throwing.
 *
 * Loads the plugin's client lazily (only when credentials are present) so
 * importing this module never touches the plugin package — unit tests
 * inject a mock via the `ShiprocketCarrier` constructor directly and never
 * call this factory.
 */
export function createShiprocketCarrier(): ShipmentCarrier {
  const email = process.env.SHIPROCKET_EMAIL
  const password = process.env.SHIPROCKET_PASSWORD

  if (!email || !password) {
    return new ShiprocketCarrier(null)
  }

  // The plugin ships no .d.ts files, so we type just the constructor shape
  // this adapter relies on. `require()` (rather than a static `import`)
  // keeps module resolution simple for a subpath the plugin's own
  // package.json `exports` map exposes but doesn't publish types for.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ShiprocketClient = require("@sam-ael/medusa-plugin-shiprocket/providers/shiprocket/client") as {
    default: new (options: {
      email: string
      password: string
      pickup_location?: string
      timeout?: number
      logger?: unknown
    }) => ShiprocketClientLike
  }

  const client = new ShiprocketClient.default({
    email,
    password,
    pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION,
  })

  return new ShiprocketCarrier(client)
}
