import {
  createStep,
  createWorkflow,
  StepResponse,
  transform,
  when,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  useQueryGraphStep,
  createOrderFulfillmentWorkflow,
  cancelOrderFulfillmentWorkflow,
} from "@medusajs/medusa/core-flows"
import type { MedusaContainer } from "@medusajs/framework/types"
import { WMS_MODULE } from "../modules/wms"
import type WmsModuleService from "../modules/wms/service"

/* ------------------------------------------------------------------------ *
 * Shared constant                                                           *
 * ------------------------------------------------------------------------ */

export const SHIPROCKET_PROVIDER_ID = "shiprocket_shiprocket"

/* ========================================================================== *
 * Workflow: create-shipment                                                  *
 *                                                                            *
 * Fires (via the order-placed-shipment subscriber) when an order is placed. *
 * If the order's shipping method targets the Shiprocket fulfillment          *
 * provider, this creates the Medusa fulfillment (which triggers the         *
 * Shiprocket plugin's provider -> Shiprocket order + AWB + label, and        *
 * deducts stock via core workflows), then records a wms `shipment` row and  *
 * enqueues a `print_job` for the label. Idempotent: a second run for an     *
 * order that already has a wms shipment just returns the existing row.     *
 * ========================================================================== */

export type CreateShipmentInput = {
  order_id: string
}

export type CreateShipmentOutput = {
  skipped: boolean
  shipment?: Record<string, any>
  print_job?: Record<string, any> | null
}

/* --------------------- Step: check existing shipment ---------------------- */
/**
 * Read-only idempotency guard. If a wms shipment already exists for this
 * order, the rest of the workflow is short-circuited (see `when` below) and
 * the existing shipment (+ its most recent print_job, if any) is returned.
 */
type ExistingShipmentLookup = {
  shipment: Record<string, any> | null
  print_job: Record<string, any> | null
}

const checkExistingShipmentStep = createStep(
  "check-existing-wms-shipment",
  async (input: { order_id: string }, { container }) => {
    const wms: WmsModuleService = container.resolve(WMS_MODULE)
    const [shipment] = await wms.listShipments(
      { order_id: input.order_id },
      { take: 1 }
    )

    if (!shipment) {
      const empty: ExistingShipmentLookup = { shipment: null, print_job: null }
      return new StepResponse(empty)
    }

    const [printJob] = await wms.listPrintJobs(
      { shipment_id: (shipment as any).id },
      { take: 1 }
    )

    const found: ExistingShipmentLookup = {
      shipment,
      print_job: printJob ?? null,
    }
    return new StepResponse(found)
  }
)

/* -------------- Step: create the Medusa fulfillment (Shiprocket) ---------- */
/**
 * Invokes Medusa's core createOrderFulfillmentWorkflow, which triggers the
 * Shiprocket fulfillment provider's `createFulfillment` (Shiprocket order +
 * AWB + label) and deducts stock via core steps (reservation consumption +
 * adjustInventoryLevelsStep). The provider's `data`/`labels` written onto the
 * fulfillment row are read back with a fresh query.graph call rather than
 * trusting the workflow's own return value, since the fulfillment module's
 * `createFulfillment` returns the entity captured *before* the provider
 * result is persisted onto it.
 *
 * Compensation cancels the Medusa fulfillment via the core
 * cancelOrderFulfillmentWorkflow, which triggers the plugin's
 * `cancelFulfillment` (Shiprocket order cancel) and restocks.
 */
type FulfillmentItem = { id: string; quantity: unknown }

type CreatedFulfillmentInfo = {
  fulfillment_id: string
  data: Record<string, any> | null
  labels: { label_url?: string | null }[] | null
}

const createOrderFulfillmentForShipmentStep = createStep(
  "create-order-fulfillment-for-shipment",
  async (
    input: { order_id: string; items: FulfillmentItem[] },
    { container }: { container: MedusaContainer }
  ) => {
    const { result } = await createOrderFulfillmentWorkflow(container).run({
      input: {
        order_id: input.order_id,
        items: input.items.map((item) => ({
          id: item.id,
          quantity: item.quantity as any,
        })),
      },
    })

    const fulfillmentId = (result as any).id

    // Re-query rather than trust `result` — the fulfillment module returns
    // the entity captured *before* the provider's data/labels are persisted.
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: fulfillments } = await query.graph({
      entity: "fulfillment",
      fields: ["id", "data", "labels.*"],
      filters: { id: fulfillmentId },
    })
    const fulfillment = fulfillments[0] as any

    const info: CreatedFulfillmentInfo = {
      fulfillment_id: fulfillmentId,
      data: fulfillment?.data ?? null,
      labels: fulfillment?.labels ?? null,
    }

    return new StepResponse(info, {
      order_id: input.order_id,
      fulfillment_id: fulfillmentId,
    })
  },
  async (
    compensationInput: { order_id: string; fulfillment_id: string } | undefined,
    { container }: { container: MedusaContainer }
  ) => {
    if (!compensationInput) return
    await cancelOrderFulfillmentWorkflow(container).run({
      input: {
        order_id: compensationInput.order_id,
        fulfillment_id: compensationInput.fulfillment_id,
      },
    })
  }
)

/* --------------------- Step: create the wms shipment row ------------------ */

const createWmsShipmentStep = createStep(
  "create-wms-shipment",
  async (
    input: {
      order_id: string
      status: string
      awb: string | null
      shiprocket_order_id: string | null
      label_url: string | null
      courier: string | null
    },
    { container }
  ) => {
    const wms: WmsModuleService = container.resolve(WMS_MODULE)
    const shipment = await wms.createShipments(input as any)
    return new StepResponse(shipment, (shipment as any).id)
  },
  async (shipmentId: string | undefined, { container }) => {
    if (!shipmentId) return
    const wms: WmsModuleService = container.resolve(WMS_MODULE)
    await wms.deleteShipments(shipmentId)
  }
)

/* -------------------- Step: enqueue the print job -------------------------- */

const createPrintJobStep = createStep(
  "create-print-job-for-shipment",
  async (
    input: { shipment_id: string; label_url: string; status: string },
    { container }
  ) => {
    const wms: WmsModuleService = container.resolve(WMS_MODULE)
    const printJob = await wms.createPrintJobs(input as any)
    return new StepResponse(printJob, (printJob as any).id)
  },
  async (printJobId: string | undefined, { container }) => {
    if (!printJobId) return
    const wms: WmsModuleService = container.resolve(WMS_MODULE)
    await wms.deletePrintJobs(printJobId)
  }
)

/* ------------------------------- Workflow ---------------------------------- */

export const createShipmentWorkflow = createWorkflow(
  "wms-create-shipment",
  function (input: CreateShipmentInput) {
    const { data: order } = useQueryGraphStep({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "shipping_methods.id",
        "shipping_methods.shipping_option_id",
        "items.*",
      ],
      filters: { id: input.order_id },
      options: { throwIfKeyNotFound: true, isList: false },
    }).config({ name: "get-order-for-shipment" })

    const shippingOptionIds = transform({ order }, (data) => {
      const methods = (data.order as any).shipping_methods ?? []
      return methods
        .map((sm: any) => sm.shipping_option_id)
        .filter((id: unknown): id is string => Boolean(id))
    })

    const { data: shippingOptions } = useQueryGraphStep({
      entity: "shipping_option",
      fields: ["id", "provider_id"],
      filters: { id: shippingOptionIds },
    }).config({ name: "get-shipping-options-for-shipment" })

    const isShiprocket = transform({ shippingOptions }, (data) =>
      data.shippingOptions.some(
        (so: any) => so.provider_id === SHIPROCKET_PROVIDER_ID
      )
    )

    const existing = checkExistingShipmentStep({ order_id: input.order_id })

    const shouldCreate = transform({ isShiprocket, existing }, (data) => {
      return Boolean(data.isShiprocket) && !data.existing.shipment
    })

    const created = when(shouldCreate, (should) => should).then(() => {
      // Coerce quantity to a plain number here: order line item quantities
      // are BigNumber-decorated objects, and every workflow step boundary
      // (including nested workflow invocations) round-trips its input
      // through the orchestration engine's serialization — a BigNumber
      // object doesn't survive that intact, which silently breaks the order
      // module's fulfillment validation ("Quantity to fulfill ... is
      // required") several steps downstream. A plain number is immune.
      const items = transform({ order }, (data) => {
        const orderItems = (data.order as any).items ?? []
        return orderItems.map((item: any) => ({
          id: item.id,
          quantity: Number(item.quantity),
        }))
      })

      const fulfillmentResult = createOrderFulfillmentForShipmentStep({
        order_id: input.order_id,
        items,
      })

      const shipmentInput = transform(
        { input, fulfillmentResult },
        (data) => {
          const f = data.fulfillmentResult
          const awb = f.data && f.data.awb ? String(f.data.awb) : null
          const shiprocketOrderId =
            f.data && f.data.order_id != null ? String(f.data.order_id) : null
          const labelUrl =
            f.labels && f.labels.length && f.labels[0].label_url
              ? f.labels[0].label_url
              : null
          const courier =
            f.data && f.data.courier_name ? String(f.data.courier_name) : null

          return {
            order_id: data.input.order_id,
            status: "label_ready",
            awb,
            shiprocket_order_id: shiprocketOrderId,
            label_url: labelUrl,
            courier,
          }
        }
      )

      const shipment = createWmsShipmentStep(shipmentInput)

      const printJobInput = transform({ shipment }, (data) => ({
        shipment_id: (data.shipment as any).id,
        label_url: (data.shipment as any).label_url
          ? (data.shipment as any).label_url
          : "",
        status: "pending",
      }))

      const printJob = createPrintJobStep(printJobInput)

      return transform({ shipment, printJob }, (data) => ({
        shipment: data.shipment,
        print_job: data.printJob,
      }))
    })

    const result = transform(
      { isShiprocket, existing, created },
      (data): CreateShipmentOutput => {
        if (!data.isShiprocket) {
          return { skipped: true }
        }
        if (data.existing.shipment) {
          return {
            skipped: false,
            shipment: data.existing.shipment,
            print_job: data.existing.print_job,
          }
        }
        const created = data.created as
          | { shipment: Record<string, any>; print_job: Record<string, any> | null }
          | undefined
        return {
          skipped: false,
          shipment: created?.shipment,
          print_job: created?.print_job,
        }
      }
    )

    return new WorkflowResponse(result)
  }
)

export default createShipmentWorkflow

/* ========================================================================== *
 * Workflow: cancel-shipment                                                  *
 *                                                                            *
 * Fires (via the order-canceled-shipment subscriber) when an order is       *
 * canceled. If a wms shipment exists and isn't already fulfilled/cancelled, *
 * this cancels the Medusa fulfillment (if it isn't already canceled — the   *
 * normal admin flow cancels the fulfillment before the order itself can be  *
 * canceled, so this is a defensive no-op in that path, and the real work in *
 * that case is the one below), marks the wms shipment `cancelled`, and      *
 * marks its pending print_job `failed`.                                    *
 * ========================================================================== */

export type CancelShipmentInput = {
  order_id: string
}

export type CancelShipmentOutput = {
  skipped: boolean
  shipment?: Record<string, any>
}

/* --------------------- Step: load the wms shipment ------------------------- */

const loadShipmentForCancelStep = createStep(
  "load-wms-shipment-for-cancel",
  async (input: { order_id: string }, { container }) => {
    const wms: WmsModuleService = container.resolve(WMS_MODULE)
    const [shipment] = await wms.listShipments(
      { order_id: input.order_id },
      { take: 1 }
    )
    return new StepResponse({ shipment: shipment ?? null })
  }
)

/* ------------- Step: cancel the Medusa fulfillment (Shiprocket) ----------- */

const cancelMedusaFulfillmentForShipmentStep = createStep(
  "cancel-medusa-fulfillment-for-shipment",
  async (
    input: { order_id: string; fulfillment_id: string },
    { container }: { container: MedusaContainer }
  ) => {
    await cancelOrderFulfillmentWorkflow(container).run({
      input: {
        order_id: input.order_id,
        fulfillment_id: input.fulfillment_id,
      },
    })
    return new StepResponse({
      order_id: input.order_id,
      fulfillment_id: input.fulfillment_id,
    })
  }
  // No compensation: cancelling the fulfillment (and the Shiprocket order
  // behind it) is not practically reversible, matching the core
  // cancelOrderFulfillmentWorkflow's own cancel-fulfillment step.
)

/* --------------------- Step: mark wms shipment cancelled ------------------- */

const markShipmentCancelledStep = createStep(
  "mark-wms-shipment-cancelled",
  async (input: { shipment_id: string }, { container }) => {
    const wms: WmsModuleService = container.resolve(WMS_MODULE)
    const shipment = await wms.retrieveShipment(input.shipment_id)
    const priorStatus = (shipment as any).status
    const updated = await wms.updateShipments({
      id: input.shipment_id,
      status: "cancelled",
    } as any)
    return new StepResponse(updated, {
      id: input.shipment_id,
      priorStatus,
    })
  },
  async (
    compensationInput: { id: string; priorStatus: string } | undefined,
    { container }
  ) => {
    if (!compensationInput) return
    const wms: WmsModuleService = container.resolve(WMS_MODULE)
    await wms.updateShipments({
      id: compensationInput.id,
      status: compensationInput.priorStatus,
    } as any)
  }
)

/* -------------- Step: mark the shipment's pending print job failed -------- */

const markPendingPrintJobFailedStep = createStep(
  "mark-pending-print-job-failed",
  async (input: { shipment_id: string }, { container }) => {
    const wms: WmsModuleService = container.resolve(WMS_MODULE)
    const [printJob] = await wms.listPrintJobs(
      { shipment_id: input.shipment_id, status: "pending" },
      { take: 1 }
    )

    if (!printJob) {
      return new StepResponse(null, null)
    }

    const priorStatus = (printJob as any).status
    const priorError = (printJob as any).error
    const updated = await wms.updatePrintJobs({
      id: (printJob as any).id,
      status: "failed",
      error: "order cancelled",
    } as any)

    return new StepResponse(updated, {
      id: (printJob as any).id,
      priorStatus,
      priorError,
    })
  },
  async (
    compensationInput:
      | { id: string; priorStatus: string; priorError: string | null }
      | undefined
      | null,
    { container }
  ) => {
    if (!compensationInput) return
    const wms: WmsModuleService = container.resolve(WMS_MODULE)
    await wms.updatePrintJobs({
      id: compensationInput.id,
      status: compensationInput.priorStatus,
      error: compensationInput.priorError,
    } as any)
  }
)

/* ------------------------------- Workflow ---------------------------------- */

export const cancelShipmentWorkflow = createWorkflow(
  "wms-cancel-shipment",
  function (input: CancelShipmentInput) {
    const shipmentLookup = loadShipmentForCancelStep({
      order_id: input.order_id,
    })

    const { data: order } = useQueryGraphStep({
      entity: "order",
      fields: [
        "id",
        "fulfillments.id",
        "fulfillments.canceled_at",
        "fulfillments.provider_id",
      ],
      filters: { id: input.order_id },
      options: { throwIfKeyNotFound: true, isList: false },
    }).config({ name: "get-order-fulfillments-for-cancel" })

    const guard = transform({ shipmentLookup, order }, (data) => {
      const shipment = data.shipmentLookup.shipment as any
      const shouldCancelShipment = Boolean(
        shipment && shipment.status !== "fulfilled" && shipment.status !== "cancelled"
      )

      const order = data.order as any
      const fulfillments = order && order.fulfillments ? order.fulfillments : []
      const active = fulfillments.find(
        (f: any) => f.provider_id === SHIPROCKET_PROVIDER_ID && !f.canceled_at
      )

      return {
        shouldCancelShipment,
        shouldCancelFulfillment: shouldCancelShipment && Boolean(active),
        fulfillment_id: active ? active.id : null,
        shipment_id: shipment ? shipment.id : null,
      }
    })

    when(guard, (g) => g.shouldCancelFulfillment).then(() => {
      const cancelFulfillmentInput = transform({ input, guard }, (data) => ({
        order_id: data.input.order_id,
        fulfillment_id: data.guard.fulfillment_id as string,
      }))
      cancelMedusaFulfillmentForShipmentStep(cancelFulfillmentInput)
    })

    const updated = when(guard, (g) => g.shouldCancelShipment).then(() => {
      const shipmentIdInput = transform({ guard }, (data) => ({
        shipment_id: data.guard.shipment_id as string,
      }))

      const cancelledShipment = markShipmentCancelledStep(shipmentIdInput)
      markPendingPrintJobFailedStep(shipmentIdInput)

      return cancelledShipment
    })

    const result = transform(
      { guard, updated },
      (data): CancelShipmentOutput => {
        if (!data.guard.shouldCancelShipment) {
          return { skipped: true }
        }
        return { skipped: false, shipment: data.updated }
      }
    )

    return new WorkflowResponse(result)
  }
)
