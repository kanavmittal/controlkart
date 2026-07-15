import {
  createStep,
  createWorkflow,
  StepResponse,
  transform,
  when,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { WMS_MODULE } from "../modules/wms"
import type WmsModuleService from "../modules/wms/service"
import { getPurchaseOrderWithLines } from "./create-purchase-order"

/* ------------------------------------------------------------------------ *
 * Workflow: commit a receiving session against an open purchase order       *
 * ------------------------------------------------------------------------ */

export type ReceivePurchaseOrderInput = {
  po_id: string
  session_id: string
  staff_id: string
  items: {
    line_id: string
    serials?: string[]
    quantity?: number
  }[]
}

type ValidatedReceiveLine = {
  line_id: string
  variant_id: string
  received: number
  serials: string[] | null
}

/* -------------------------- Step 1: idempotency -------------------------- */
/**
 * Committed session ids live on purchase_order.metadata.received_sessions.
 * If session_id is already recorded there, the rest of the workflow is
 * short-circuited (see the `when` in the composition function below) and the
 * current PO state is returned as-is. Purely read-only, no compensation.
 */
const checkIdempotentSessionStep = createStep(
  "check-idempotent-receive-session",
  async (
    input: { po_id: string; session_id: string },
    { container }
  ) => {
    const purchaseOrder = await getPurchaseOrderWithLines(container, input.po_id)
    const sessions: string[] = purchaseOrder.metadata?.received_sessions ?? []
    const alreadyCommitted = sessions.includes(input.session_id)

    return new StepResponse({ purchaseOrder, alreadyCommitted })
  }
)

/* --------------------------- Step 2: validate ---------------------------- */
/**
 * Validates PO status, that every line_id belongs to this PO, that
 * serialized/non-serialized lines got the right payload shape, and re-checks
 * (scan-time checks can race) that no submitted serial already exists for
 * its variant. Purely read-only, no compensation.
 */
const validateReceiveStep = createStep(
  "validate-receive-items",
  async (
    input: {
      po_id: string
      items: ReceivePurchaseOrderInput["items"]
    },
    { container }: { container: MedusaContainer }
  ) => {
    const purchaseOrder = await getPurchaseOrderWithLines(container, input.po_id)

    if (!["open", "partially_received"].includes(purchaseOrder.status)) {
      throw new MedusaError(
        MedusaError.Types.CONFLICT,
        `Purchase order "${input.po_id}" is not open for receiving (status: "${purchaseOrder.status}")`
      )
    }

    if (!input.items.length) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "At least one item must be submitted"
      )
    }

    const linesById = new Map(
      (purchaseOrder.lines ?? []).map((line: any) => [line.id, line])
    )
    for (const item of input.items) {
      if (!linesById.has(item.line_id)) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Line "${item.line_id}" does not belong to purchase order "${input.po_id}"`
        )
      }
    }

    const variantIds = [
      ...new Set(
        input.items.map((item) => (linesById.get(item.line_id) as any).variant_id)
      ),
    ]
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: variants } = await query.graph({
      entity: "variant",
      fields: ["id", "metadata"],
      filters: { id: variantIds },
    })
    const serializedByVariantId = new Map(
      (variants as any[]).map((v) => [v.id, v.metadata?.serialized === true])
    )

    const validated: ValidatedReceiveLine[] = []
    const submittedSerialKeys = new Set<string>()
    const serialsByVariant = new Map<string, string[]>()

    for (const item of input.items) {
      const line = linesById.get(item.line_id) as any
      const serialized = serializedByVariantId.get(line.variant_id) ?? false

      if (serialized) {
        if (!item.serials || !item.serials.length) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Line "${item.line_id}" is serialized and requires "serials"`
          )
        }
        for (const serial of item.serials) {
          const key = `${line.variant_id}::${serial}`
          if (submittedSerialKeys.has(key)) {
            throw new MedusaError(
              MedusaError.Types.INVALID_DATA,
              `Serial "${serial}" submitted more than once for variant "${line.variant_id}"`
            )
          }
          submittedSerialKeys.add(key)
        }
        const list = serialsByVariant.get(line.variant_id) ?? []
        list.push(...item.serials)
        serialsByVariant.set(line.variant_id, list)

        validated.push({
          line_id: item.line_id,
          variant_id: line.variant_id,
          received: item.serials.length,
          serials: item.serials,
        })
      } else {
        if (item.quantity == null || item.quantity <= 0) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Line "${item.line_id}" is not serialized and requires a positive "quantity"`
          )
        }
        validated.push({
          line_id: item.line_id,
          variant_id: line.variant_id,
          received: item.quantity,
          serials: null,
        })
      }
    }

    // Re-check no submitted serial already exists for its variant — scan-time
    // checks (the /scan endpoint) can race against a concurrent receive.
    if (serialsByVariant.size) {
      const wms: WmsModuleService = container.resolve(WMS_MODULE)
      for (const [variantId, serials] of serialsByVariant) {
        const existing = await wms.listSerialUnits({
          variant_id: variantId,
          serial: serials,
        })
        if (existing.length) {
          throw new MedusaError(
            MedusaError.Types.CONFLICT,
            `Serial(s) already exist for variant "${variantId}": ${existing
              .map((e: any) => e.serial)
              .join(", ")}`
          )
        }
      }
    }

    return new StepResponse({ lines: validated })
  }
)

/* --------------------- Step 3: create serial_units ------------------------ */
/**
 * Chunked inserts (batches of 100). Compensation deletes every created
 * serial_unit id.
 */
const createSerialUnitsStep = createStep(
  "create-received-serial-units",
  async (
    input: {
      po_id: string
      staff_id: string
      lines: ValidatedReceiveLine[]
    },
    { container }
  ) => {
    const wms: WmsModuleService = container.resolve(WMS_MODULE)

    const toCreate = input.lines
      .filter((line) => line.serials)
      .flatMap((line) =>
        (line.serials as string[]).map((serial) => ({
          variant_id: line.variant_id,
          serial,
          purchase_order_id: input.po_id,
          received_by: input.staff_id,
        }))
      )

    if (!toCreate.length) {
      return new StepResponse([], [] as string[])
    }

    const CHUNK_SIZE = 100
    const created: any[] = []
    for (let i = 0; i < toCreate.length; i += CHUNK_SIZE) {
      const batch = toCreate.slice(i, i + CHUNK_SIZE)
      const result = await wms.createSerialUnits(batch)
      const rows = Array.isArray(result) ? result : [result]
      created.push(...rows)
    }

    return new StepResponse(
      created,
      created.map((row) => row.id)
    )
  },
  async (serialIds, { container }) => {
    if (!serialIds?.length) return
    const wms: WmsModuleService = container.resolve(WMS_MODULE)
    await wms.deleteSerialUnits(serialIds)
  }
)

/* ------------------------ Step 4: adjust inventory ------------------------ */
/**
 * For each variant, resolve its inventory item + the (first) stock location,
 * then either create the inventory level (first-receipt case) or bump the
 * existing one by the received quantity. Compensation always negates the
 * adjustment — for levels created here that returns the level to zero,
 * which satisfies "adjust back to 0 or delete the level" without needing to
 * know which branch ran.
 */
type InventoryAdjustment = {
  variant_id: string
  inventory_item_id: string
  location_id: string
  received: number
}

const adjustInventoryForReceiptStep = createStep(
  "adjust-inventory-for-receipt",
  async (
    input: { lines: ValidatedReceiveLine[] },
    { container }: { container: MedusaContainer }
  ) => {
    const receivedByVariant = new Map<string, number>()
    for (const line of input.lines) {
      receivedByVariant.set(
        line.variant_id,
        (receivedByVariant.get(line.variant_id) ?? 0) + line.received
      )
    }
    const variantIds = [...receivedByVariant.keys()]

    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: variants } = await query.graph({
      entity: "variant",
      fields: ["id", "inventory_items.inventory_item_id"],
      filters: { id: variantIds },
    })

    const inventoryModule: any = container.resolve(Modules.INVENTORY)
    const stockLocationModule: any = container.resolve(Modules.STOCK_LOCATION)

    const [location] = await stockLocationModule.listStockLocations(
      {},
      { take: 1 }
    )
    if (!location) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "No stock location is configured to receive inventory into"
      )
    }

    const adjustments: InventoryAdjustment[] = []

    for (const variant of variants as any[]) {
      const received = receivedByVariant.get(variant.id) as number
      const inventoryItemId = variant.inventory_items?.[0]?.inventory_item_id

      if (!inventoryItemId) {
        throw new MedusaError(
          MedusaError.Types.NOT_FOUND,
          `Variant "${variant.id}" has no linked inventory item`
        )
      }

      const existingLevels = await inventoryModule.listInventoryLevels({
        inventory_item_id: inventoryItemId,
        location_id: location.id,
      })

      if (!existingLevels.length) {
        await inventoryModule.createInventoryLevels({
          inventory_item_id: inventoryItemId,
          location_id: location.id,
          stocked_quantity: received,
        })
      } else {
        await inventoryModule.adjustInventory(
          inventoryItemId,
          location.id,
          received
        )
      }

      adjustments.push({
        variant_id: variant.id,
        inventory_item_id: inventoryItemId,
        location_id: location.id,
        received,
      })
    }

    return new StepResponse(adjustments, adjustments)
  },
  async (adjustments, { container }) => {
    if (!adjustments?.length) return
    const inventoryModule: any = container.resolve(Modules.INVENTORY)
    for (const adjustment of adjustments) {
      await inventoryModule.adjustInventory(
        adjustment.inventory_item_id,
        adjustment.location_id,
        -adjustment.received
      )
    }
  }
)

/* -------------------------- Step 5: finalize ------------------------------ */
/**
 * Bumps each line's quantity_received, flips the PO status, and appends
 * session_id to metadata.received_sessions. The compensation input
 * explicitly carries po_id (not just the step's return value) — a step that
 * relied only on its own output couldn't locate the PO to roll back.
 */
type FinalizeCompensationInput = {
  po_id: string
  priorStatus: string
  priorSessions: string[]
  priorLineState: { id: string; quantity_received: number }[]
}

const finalizeReceiveStep = createStep(
  "finalize-purchase-order-receipt",
  async (
    input: {
      po_id: string
      session_id: string
      lines: ValidatedReceiveLine[]
    },
    { container }
  ) => {
    const wms: WmsModuleService = container.resolve(WMS_MODULE)
    const purchaseOrder = await getPurchaseOrderWithLines(container, input.po_id)

    const receivedByLine = new Map(
      input.lines.map((line) => [line.line_id, line.received])
    )

    const priorLineState = (purchaseOrder.lines ?? []).map((line: any) => ({
      id: line.id,
      quantity_received: line.quantity_received,
    }))
    const priorStatus = purchaseOrder.status
    const priorSessions: string[] = purchaseOrder.metadata?.received_sessions ?? []

    let allLinesComplete = true
    for (const line of purchaseOrder.lines ?? []) {
      const additional = receivedByLine.get(line.id) ?? 0
      const newReceived = line.quantity_received + additional
      await wms.updatePurchaseOrderLines({
        id: line.id,
        quantity_received: newReceived,
      })
      if (newReceived < line.quantity_ordered) {
        allLinesComplete = false
      }
    }

    const newStatus = allLinesComplete ? "received" : "partially_received"
    const newSessions = priorSessions.concat(input.session_id)

    await wms.updatePurchaseOrders({
      id: input.po_id,
      status: newStatus,
      metadata: {
        ...(purchaseOrder.metadata ?? {}),
        received_sessions: newSessions,
      },
    })

    const updated = await getPurchaseOrderWithLines(container, input.po_id)

    const compensationInput: FinalizeCompensationInput = {
      po_id: input.po_id,
      priorStatus,
      priorSessions,
      priorLineState,
    }

    return new StepResponse(updated, compensationInput)
  },
  async (compensationInput, { container }) => {
    if (!compensationInput) return
    const { po_id, priorStatus, priorSessions, priorLineState } =
      compensationInput

    const wms: WmsModuleService = container.resolve(WMS_MODULE)

    for (const line of priorLineState) {
      await wms.updatePurchaseOrderLines({
        id: line.id,
        quantity_received: line.quantity_received,
      })
    }

    await wms.updatePurchaseOrders({
      id: po_id,
      status: priorStatus as any,
      metadata: { received_sessions: priorSessions },
    })
  }
)

/* ------------------------------- Workflow --------------------------------- */

export const receivePurchaseOrderWorkflow = createWorkflow(
  "receive-purchase-order",
  function (input: ReceivePurchaseOrderInput) {
    const idempotency = checkIdempotentSessionStep(input)

    const shouldReceive = transform(
      { idempotency },
      (data) => !data.idempotency.alreadyCommitted
    )

    const received = when(shouldReceive, (should) => should).then(() => {
      const validated = validateReceiveStep(input)

      const serialInput = transform({ input, validated }, (data) => ({
        po_id: data.input.po_id,
        staff_id: data.input.staff_id,
        lines: data.validated.lines,
      }))
      createSerialUnitsStep(serialInput)

      const inventoryInput = transform({ validated }, (data) => ({
        lines: data.validated.lines,
      }))
      adjustInventoryForReceiptStep(inventoryInput)

      const finalizeInput = transform({ input, validated }, (data) => ({
        po_id: data.input.po_id,
        session_id: data.input.session_id,
        lines: data.validated.lines,
      }))
      const finalized = finalizeReceiveStep(finalizeInput)

      return finalized
    })

    const result = transform({ idempotency, received }, (data) =>
      data.received ? data.received : data.idempotency.purchaseOrder
    )

    return new WorkflowResponse(result)
  }
)

export default receivePurchaseOrderWorkflow
