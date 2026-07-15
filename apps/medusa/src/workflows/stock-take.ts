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
} from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { WMS_MODULE } from "../modules/wms"
import type WmsModuleService from "../modules/wms/service"

/* ------------------------------------------------------------------------ *
 * Workflow: PO-less stock-take — ATTACH serials to already-correct shelf    *
 * stock. Zero inventory changes, ever, anywhere in this workflow.           *
 * ------------------------------------------------------------------------ */

export type StockTakeInput = {
  staff_id: string
  session_id: string
  items: {
    variant_id: string
    serials: string[]
  }[]
}

type ValidatedStockTakeLine = {
  variant_id: string
  serials: string[]
}

/* -------------------------- Step 1: idempotency -------------------------- */
/**
 * Committed sessions live in the stock_take_session table (keyed uniquely
 * on session_id). If session_id was already recorded, the rest of the
 * workflow is short-circuited (see the `when` in the composition function
 * below). Purely read-only, no compensation.
 */
const checkIdempotentStockTakeSessionStep = createStep(
  "check-idempotent-stock-take-session",
  async (input: { session_id: string }, { container }) => {
    const wms: WmsModuleService = container.resolve(WMS_MODULE)
    const [existing] = await wms.listStockTakeSessions({
      session_id: input.session_id,
    })

    return new StepResponse({
      alreadyCommitted: !!existing,
      serialCount: existing ? existing.serial_count : 0,
    })
  }
)

/* --------------------------- Step 2: validate ---------------------------- */
/**
 * Read-only. items non-empty; every variant exists AND is serialized
 * (metadata.serialized === true); no submitted serial duplicated in the
 * payload; re-check none already exists in serial_unit for its variant.
 */
const validateStockTakeStep = createStep(
  "validate-stock-take-items",
  async (
    input: { items: StockTakeInput["items"] },
    { container }: { container: MedusaContainer }
  ) => {
    if (!input.items.length) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "At least one item must be submitted"
      )
    }

    const variantIds = [...new Set(input.items.map((item) => item.variant_id))]
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: variants } = await query.graph({
      entity: "variant",
      fields: ["id", "metadata"],
      filters: { id: variantIds },
    })

    const variantById = new Map((variants as any[]).map((v) => [v.id, v]))
    const missing = variantIds.filter((id) => !variantById.has(id))
    if (missing.length) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Unknown product variant(s): ${missing.join(", ")}`
      )
    }

    const notSerialized = variantIds.filter(
      (id) => variantById.get(id)?.metadata?.serialized !== true
    )
    if (notSerialized.length) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Stock-take is for serialized variants only; not serialized: ${notSerialized.join(", ")}`
      )
    }

    const submittedSerialKeys = new Set<string>()
    const validated: ValidatedStockTakeLine[] = []

    for (const item of input.items) {
      if (!item.serials || !item.serials.length) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Variant "${item.variant_id}" requires at least one serial`
        )
      }
      for (const serial of item.serials) {
        const key = `${item.variant_id}::${serial}`
        if (submittedSerialKeys.has(key)) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Serial "${serial}" submitted more than once for variant "${item.variant_id}"`
          )
        }
        submittedSerialKeys.add(key)
      }
      validated.push({ variant_id: item.variant_id, serials: item.serials })
    }

    // Re-check none already exists in serial_unit for its variant — scan-time
    // checks can race against a concurrent stock-take or receive.
    const wms: WmsModuleService = container.resolve(WMS_MODULE)
    for (const line of validated) {
      const existing = await wms.listSerialUnits({
        variant_id: line.variant_id,
        serial: line.serials,
      })
      if (existing.length) {
        throw new MedusaError(
          MedusaError.Types.CONFLICT,
          `Serial(s) already exist for variant "${line.variant_id}": ${existing
            .map((e: any) => e.serial)
            .join(", ")}`
        )
      }
    }

    return new StepResponse({ lines: validated })
  }
)

/* --------------------- Step 3: create serial_units ------------------------ */
/**
 * Chunked inserts (batches of 100), purchase_order_id: null, received_by:
 * staff_id. Compensation deletes every created serial_unit id. NO inventory
 * module usage — stock-take never touches inventory.
 */
const createStockTakeSerialUnitsStep = createStep(
  "create-stock-take-serial-units",
  async (
    input: { staff_id: string; lines: ValidatedStockTakeLine[] },
    { container }
  ) => {
    const wms: WmsModuleService = container.resolve(WMS_MODULE)

    const toCreate = input.lines.flatMap((line) =>
      line.serials.map((serial) => ({
        variant_id: line.variant_id,
        serial,
        purchase_order_id: null,
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

/* ------------------------- Step 4: record session -------------------------- */
/**
 * Create the stock_take_session row (session_id, staff_id, serial_count).
 * Compensation deletes it.
 */
const recordStockTakeSessionStep = createStep(
  "record-stock-take-session",
  async (
    input: { session_id: string; staff_id: string; serial_count: number },
    { container }
  ) => {
    const wms: WmsModuleService = container.resolve(WMS_MODULE)
    const session = await wms.createStockTakeSessions({
      session_id: input.session_id,
      staff_id: input.staff_id,
      serial_count: input.serial_count,
    })

    return new StepResponse(session, session.id)
  },
  async (sessionId, { container }) => {
    if (!sessionId) return
    const wms: WmsModuleService = container.resolve(WMS_MODULE)
    await wms.deleteStockTakeSessions(sessionId)
  }
)

/* ------------------------------- Workflow --------------------------------- */

export const stockTakeWorkflow = createWorkflow(
  "stock-take",
  function (input: StockTakeInput) {
    const idempotency = checkIdempotentStockTakeSessionStep({
      session_id: input.session_id,
    })

    const shouldCommit = transform(
      { idempotency },
      (data) => !data.idempotency.alreadyCommitted
    )

    const committed = when(shouldCommit, (should) => should).then(() => {
      const validated = validateStockTakeStep(input)

      const serialInput = transform({ input, validated }, (data) => ({
        staff_id: data.input.staff_id,
        lines: data.validated.lines,
      }))
      const created = createStockTakeSerialUnitsStep(serialInput)

      const sessionInput = transform({ input, created }, (data) => ({
        session_id: data.input.session_id,
        staff_id: data.input.staff_id,
        serial_count: data.created.length,
      }))
      recordStockTakeSessionStep(sessionInput)

      return transform({ created }, (data) => ({
        already_committed: false,
        serial_count: data.created.length,
      }))
    })

    const result = transform({ idempotency, committed }, (data) =>
      data.committed
        ? data.committed
        : {
            already_committed: true,
            serial_count: data.idempotency.serialCount,
          }
    )

    return new WorkflowResponse(result)
  }
)

export default stockTakeWorkflow
