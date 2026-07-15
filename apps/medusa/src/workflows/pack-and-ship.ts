import {
  createStep,
  createWorkflow,
  StepResponse,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { createOrderShipmentWorkflow } from "@medusajs/medusa/core-flows"
import type { MedusaContainer } from "@medusajs/framework/types"
import { WMS_MODULE } from "../modules/wms"
import type WmsModuleService from "../modules/wms/service"
import { createShiprocketCarrier, CarrierError } from "../modules/wms/lib/carrier"

/* ========================================================================== *
 * Workflow: pack-and-ship                                                   *
 *                                                                            *
 * H7 — the outbound COMMIT path. By this point Medusa's fulfillment (and    *
 * the stock deduction that goes with it) already happened back at order     *
 * placement, via createShipmentWorkflow (H3). Completing pack/ship does NOT *
 * create a fulfillment and touches ZERO inventory — it only:                *
 *   1. marks the picked serial_units `shipped` (with the order id),         *
 *   2. tells Medusa's order the shipment went out (customer notification),  *
 *   3. best-effort schedules a Shiprocket pickup, and                       *
 *   4. flips the wms shipment to `fulfilled`.                               *
 * ========================================================================== */

export type PackAndShipInput = {
  shipment_id: string
  staff_id: string
}

type ShipmentPickState = {
  serials?: Record<
    string,
    { variant_id: string; serial_unit_id: string; picked_at: string }
  >
  quantities?: Record<string, number>
  awb_verified_at?: string
  pickup_pending?: boolean
}

function readPickState(raw: unknown): ShipmentPickState {
  return (raw ?? {}) as ShipmentPickState
}

/* --------------------------- Step 1: validate ------------------------------ *
 * Read-only. Confirms the shipment is `picked`, its AWB has been verified,   *
 * a pack photo exists, and resolves the order's active (non-canceled)        *
 * fulfillment + line items needed to register the Medusa shipment.          */

type ValidatedPackAndShip = {
  shipment: Record<string, any>
  order_id: string
  fulfillment_id: string
  items: { id: string; quantity: number }[]
  serial_unit_ids: string[]
  awb: string
  label_url: string | null
  pick_state: ShipmentPickState
}

const validatePackAndShipStep = createStep(
  "validate-pack-and-ship",
  async (
    input: { shipment_id: string },
    { container }: { container: MedusaContainer }
  ) => {
    const wms: WmsModuleService = container.resolve(WMS_MODULE)

    const [shipment] = await wms.listShipments(
      { id: input.shipment_id },
      { take: 1 }
    )
    if (!shipment) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Shipment "${input.shipment_id}" not found`
      )
    }

    const status = (shipment as any).status
    if (status !== "picked") {
      throw new MedusaError(
        MedusaError.Types.CONFLICT,
        `Shipment "${input.shipment_id}" is not ready to ship (status: "${status}")`
      )
    }

    const pickState = readPickState((shipment as any).pick_state)
    if (!pickState.awb_verified_at) {
      throw new MedusaError(
        MedusaError.Types.CONFLICT,
        `Shipment "${input.shipment_id}" has not had its AWB verified`
      )
    }

    const [packRecord] = await wms.listPackRecords(
      { shipment_id: input.shipment_id },
      { take: 1 }
    )
    if (!packRecord) {
      throw new MedusaError(
        MedusaError.Types.CONFLICT,
        `Shipment "${input.shipment_id}" has no pack photo uploaded`
      )
    }

    const awb = (shipment as any).awb
    if (!awb) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Shipment "${input.shipment_id}" has no AWB assigned`
      )
    }

    const orderId = (shipment as any).order_id as string

    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "items.id",
        "items.quantity",
        "fulfillments.id",
        "fulfillments.canceled_at",
      ],
      filters: { id: orderId },
    })
    if (!orders.length) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Order "${orderId}" not found`
      )
    }
    const order = orders[0] as any

    const activeFulfillment = (order.fulfillments ?? []).find(
      (f: any) => !f.canceled_at
    )
    if (!activeFulfillment) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Order "${orderId}" has no active fulfillment to ship`
      )
    }

    const items = (order.items ?? []).map((item: any) => ({
      id: item.id,
      quantity: Number(item.quantity),
    }))

    const serialUnitIds = Object.values(pickState.serials ?? {}).map(
      (s) => s.serial_unit_id
    )

    const validated: ValidatedPackAndShip = {
      shipment,
      order_id: orderId,
      fulfillment_id: activeFulfillment.id,
      items,
      serial_unit_ids: serialUnitIds,
      awb,
      label_url: (shipment as any).label_url ?? null,
      pick_state: pickState,
    }

    return new StepResponse(validated)
  }
)

/* ------------------- Step 2: mark serial_units shipped -------------------- *
 * Chunked (100 at a time). Compensation reverts the same ids back to        *
 * `in_stock` and clears order_id.                                          */

const CHUNK_SIZE = 100

const markSerialsShippedStep = createStep(
  "mark-serials-shipped",
  async (
    input: { serial_unit_ids: string[]; order_id: string },
    { container }
  ) => {
    const wms: WmsModuleService = container.resolve(WMS_MODULE)

    for (let i = 0; i < input.serial_unit_ids.length; i += CHUNK_SIZE) {
      const chunk = input.serial_unit_ids.slice(i, i + CHUNK_SIZE)
      if (!chunk.length) continue
      await wms.updateSerialUnits(
        chunk.map((id) => ({
          id,
          status: "shipped",
          order_id: input.order_id,
        })) as any
      )
    }

    return new StepResponse(
      { serial_unit_ids: input.serial_unit_ids },
      { serial_unit_ids: input.serial_unit_ids }
    )
  },
  async (
    compensationInput: { serial_unit_ids: string[] } | undefined,
    { container }
  ) => {
    if (!compensationInput?.serial_unit_ids?.length) return
    const wms: WmsModuleService = container.resolve(WMS_MODULE)

    for (let i = 0; i < compensationInput.serial_unit_ids.length; i += CHUNK_SIZE) {
      const chunk = compensationInput.serial_unit_ids.slice(i, i + CHUNK_SIZE)
      if (!chunk.length) continue
      await wms.updateSerialUnits(
        chunk.map((id) => ({
          id,
          status: "in_stock",
          order_id: null,
        })) as any
      )
    }
  }
)

/* ---------------- Step 3: register the Medusa order shipment -------------- *
 * Invokes core createOrderShipmentWorkflow (marks the order's fulfillment   *
 * shipped, fires the customer notification) with the AWB as tracking. No    *
 * compensation is wired: Medusa has no "un-ship" operation. This is         *
 * deliberately the LAST mutating step before the (non-critical) pickup      *
 * scheduling — any failure before it rolls back the serial_unit updates via *
 * their own compensation.                                                  */

const createOrderShipmentForPackAndShipStep = createStep(
  "create-order-shipment-for-pack-and-ship",
  async (
    input: {
      order_id: string
      fulfillment_id: string
      items: { id: string; quantity: number }[]
      staff_id: string
      awb: string
      label_url: string | null
    },
    { container }: { container: MedusaContainer }
  ) => {
    await createOrderShipmentWorkflow(container).run({
      input: {
        order_id: input.order_id,
        fulfillment_id: input.fulfillment_id,
        items: input.items,
        created_by: input.staff_id,
        labels: [
          {
            tracking_number: input.awb,
            tracking_url: `https://shiprocket.co/tracking/${input.awb}`,
            label_url: input.label_url ?? "",
          },
        ],
      },
    })

    return new StepResponse({ done: true })
  }
  // No compensation — Medusa has no operation to un-ship an order shipment.
)

/* -------------------- Step 4: schedule Shiprocket pickup ------------------ *
 * Best-effort. A CarrierError (declined/unconfigured/auth-failed) must      *
 * NEVER fail this workflow — Shiprocket has no pickup-cancel, so once the   *
 * order shipment is registered the shipment must still complete. Failures   *
 * are logged loudly and surfaced via `pickup_pending` on pick_state so ops  *
 * can follow up manually.                                                  */

const schedulePickupStep = createStep(
  "schedule-shiprocket-pickup",
  async (input: { awb: string }, { container }: { container: MedusaContainer }) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    try {
      await createShiprocketCarrier().schedulePickup({ shipmentId: input.awb })
      return new StepResponse({ scheduled: true })
    } catch (err) {
      if (err instanceof CarrierError) {
        logger.error(
          `[wms] Shiprocket pickup scheduling failed for shipment AWB "${input.awb}" (${err.code}): ${err.message}. Falling back to manual pickup.`
        )
        return new StepResponse({ scheduled: false })
      }
      throw err
    }
  }
)

/* ------------------------ Step 5: finalize shipment ------------------------ */

const finalizeShipmentStep = createStep(
  "finalize-pack-and-ship-shipment",
  async (
    input: {
      shipment_id: string
      scheduled: boolean
      pick_state: ShipmentPickState
    },
    { container }
  ) => {
    const wms: WmsModuleService = container.resolve(WMS_MODULE)

    const nextPickState: ShipmentPickState = input.scheduled
      ? input.pick_state
      : { ...input.pick_state, pickup_pending: true }

    const updated = await wms.updateShipments({
      id: input.shipment_id,
      status: "fulfilled",
      pick_state: nextPickState,
    } as any)

    return new StepResponse(updated)
  }
)

/* ------------------------------- Workflow ---------------------------------- */

export const packAndShipWorkflow = createWorkflow(
  "pack-and-ship",
  function (input: PackAndShipInput) {
    const validated = validatePackAndShipStep({
      shipment_id: input.shipment_id,
    })

    const serialsInput = transform({ validated }, (data) => ({
      serial_unit_ids: data.validated.serial_unit_ids,
      order_id: data.validated.order_id,
    }))
    markSerialsShippedStep(serialsInput)

    const shipmentInput = transform({ input, validated }, (data) => ({
      order_id: data.validated.order_id,
      fulfillment_id: data.validated.fulfillment_id,
      items: data.validated.items,
      staff_id: data.input.staff_id,
      awb: data.validated.awb,
      label_url: data.validated.label_url,
    }))
    createOrderShipmentForPackAndShipStep(shipmentInput)

    const pickupInput = transform({ validated }, (data) => ({
      awb: data.validated.awb,
    }))
    const pickupResult = schedulePickupStep(pickupInput)

    const finalizeInput = transform(
      { validated, pickupResult },
      (data) => ({
        shipment_id: data.validated.shipment.id,
        scheduled: data.pickupResult.scheduled,
        pick_state: data.validated.pick_state,
      })
    )
    const finalShipment = finalizeShipmentStep(finalizeInput)

    return new WorkflowResponse(finalShipment)
  }
)

export default packAndShipWorkflow
