import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  generateEntityId,
  MedusaError,
} from "@medusajs/framework/utils"
import { z } from "zod"
import { WMS_MODULE } from "../../../../modules/wms"
import type WmsModuleService from "../../../../modules/wms/service"
import {
  isShiftOpen,
  type ShiftRow,
} from "../../../../modules/wms/lib/shift-window"

const DEFAULT_LIMIT = 5
const MAX_LIMIT = 20

/** The single warehouse print agent — kept as a column for future multi-agent. */
const AGENT_ID = "default"

const PollSchema = z.object({
  limit: z.number().int().positive().optional(),
})

/**
 * Print agent poll: claim up to `limit` pending print jobs.
 *
 * Auth: static x-print-agent-token header (see printAgentAuth in
 * src/api/middlewares.ts) — NOT warehouse-staff bearer auth.
 *
 * Behaviour:
 * - ALWAYS records the agent heartbeat (even outside the shift window, even
 *   when there are no jobs) — "is the agent alive?" must be answerable
 *   independently of whether printing is currently allowed.
 * - Only releases jobs while a shift window (IST) is open.
 * - Claiming is atomic under concurrency: a single UPDATE whose id set comes
 *   from a `FOR UPDATE SKIP LOCKED` sub-select, so two concurrent polls can
 *   never claim the same job — the second poll skips rows the first has
 *   locked. (Raw SQL on purpose, mirroring the display_id pattern in
 *   src/workflows/create-purchase-order.ts: the module service has no
 *   claim-with-lock primitive.)
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsed = PollSchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      parsed.error.issues
        .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
        .join("; ")
    )
  }
  const limit = Math.min(parsed.data.limit ?? DEFAULT_LIMIT, MAX_LIMIT)

  const pg = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION) as any

  // Heartbeat upsert — atomic (INSERT ... ON CONFLICT), so concurrent polls
  // can't race a read-then-write into a unique violation. The conflict
  // target must repeat the partial-index predicate (deleted_at IS NULL).
  await pg.raw(
    `INSERT INTO "agent_heartbeat" ("id", "agent_id", "last_seen", "created_at", "updated_at")
     VALUES (?, ?, now(), now(), now())
     ON CONFLICT ("agent_id") WHERE deleted_at IS NULL
     DO UPDATE SET "last_seen" = now(), "updated_at" = now()`,
    [generateEntityId(undefined as unknown as string, "wagh"), AGENT_ID]
  )

  const wms: WmsModuleService = req.scope.resolve(WMS_MODULE)
  const shifts = await wms.listShiftConfigs({})

  if (!isShiftOpen(shifts as unknown as ShiftRow[], new Date())) {
    res.json({ jobs: [], shift_open: false })
    return
  }

  const { rows: jobs } = await pg.raw(
    `UPDATE "print_job"
     SET "status" = 'released', "released_at" = now(), "updated_at" = now()
     WHERE "id" IN (
       SELECT "id" FROM "print_job"
       WHERE "status" = 'pending' AND "deleted_at" IS NULL
       ORDER BY "created_at" ASC, "id" ASC
       LIMIT ?
       FOR UPDATE SKIP LOCKED
     )
     RETURNING "id", "label_url", "shipment_id", "attempts"`,
    [limit]
  )

  res.json({ jobs, shift_open: true })
}
