import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { WMS_MODULE } from "../../../../modules/wms"
import type WmsModuleService from "../../../../modules/wms/service"

const PRINT_JOB_STATUSES = [
  "pending",
  "released",
  "printing",
  "done",
  "failed",
] as const

type PrintJobStatus = (typeof PRINT_JOB_STATUSES)[number]

export type AgentState = "green" | "amber" | "red"

const GREEN_WINDOW_MS = 5 * 60 * 1000
const AMBER_WINDOW_MS = 15 * 60 * 1000

/** green <5min, amber <15min, red otherwise (or never seen). */
export const agentState = (
  lastSeen: Date | string | null | undefined,
  now: Date = new Date()
): AgentState => {
  if (!lastSeen) {
    return "red"
  }
  const age = now.getTime() - new Date(lastSeen).getTime()
  if (age < GREEN_WINDOW_MS) {
    return "green"
  }
  if (age < AMBER_WINDOW_MS) {
    return "amber"
  }
  return "red"
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const wms: WmsModuleService = req.scope.resolve(WMS_MODULE)

  const limit = Math.min(Number(req.query.limit) || 50, 100)
  const offset = Number(req.query.offset) || 0

  const rawStatus = req.query.status
  let status: PrintJobStatus | undefined
  if (typeof rawStatus === "string" && rawStatus !== "") {
    if (!PRINT_JOB_STATUSES.includes(rawStatus as PrintJobStatus)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Invalid status "${rawStatus}". Expected one of: ${PRINT_JOB_STATUSES.join(", ")}.`
      )
    }
    status = rawStatus as PrintJobStatus
  }

  const [jobs, count] = await wms.listAndCountPrintJobs(
    status ? { status } : {},
    { order: { created_at: "DESC" }, take: limit, skip: offset }
  )

  // Join shipment awb + order_id onto each job (shipment_id is nullable).
  const shipmentIds = [
    ...new Set(
      jobs.map((job) => job.shipment_id).filter((id): id is string => !!id)
    ),
  ]
  const shipments = shipmentIds.length
    ? await wms.listShipments({ id: shipmentIds })
    : []
  const shipmentById = new Map(shipments.map((s) => [s.id, s]))

  const rows = jobs.map((job) => {
    const shipment = job.shipment_id
      ? shipmentById.get(job.shipment_id)
      : undefined
    return {
      ...job,
      awb: shipment?.awb ?? null,
      order_id: shipment?.order_id ?? null,
    }
  })

  const [heartbeat] = await wms.listAgentHeartbeats(
    { agent_id: "default" },
    { take: 1 }
  )

  res.json({
    jobs: rows,
    count,
    limit,
    offset,
    agent: {
      last_seen: heartbeat?.last_seen ?? null,
      state: agentState(heartbeat?.last_seen ?? null),
    },
  })
}
