import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"
import { WMS_MODULE } from "../../../../../../modules/wms"
import type WmsModuleService from "../../../../../../modules/wms/service"

/** Failures beyond this stay `failed` — no more automatic re-releases. */
const MAX_ATTEMPTS = 3

const AckSchema = z.object({
  status: z.enum(["done", "failed"]),
  error: z.string().optional(),
})

/**
 * Print agent acknowledgement for a claimed job.
 *
 * Auth: static x-print-agent-token header (see printAgentAuth in
 * src/api/middlewares.ts) — NOT warehouse-staff bearer auth.
 *
 * - `done`   → job becomes `done`, `printed_at` stamped.
 * - `failed` → attempts incremented and the error recorded. Below
 *   MAX_ATTEMPTS the job returns to `pending` (a later poll re-releases
 *   it); at/after MAX_ATTEMPTS it stays `failed` for manual intervention.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsed = AckSchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      parsed.error.issues
        .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
        .join("; ")
    )
  }

  const wms: WmsModuleService = req.scope.resolve(WMS_MODULE)
  const [job] = await wms.listPrintJobs({ id: req.params.id })
  if (!job) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Print job with id "${req.params.id}" was not found`
    )
  }

  if (parsed.data.status === "done") {
    const updated = await wms.updatePrintJobs({
      id: job.id,
      status: "done",
      printed_at: new Date(),
      error: null,
    })
    res.json({ job: updated })
    return
  }

  const attempts = (job.attempts ?? 0) + 1
  const updated = await wms.updatePrintJobs({
    id: job.id,
    status: attempts >= MAX_ATTEMPTS ? "failed" : "pending",
    attempts,
    error: parsed.data.error ?? null,
    // Back in the pending pool → clear the stale release stamp.
    released_at: attempts >= MAX_ATTEMPTS ? job.released_at : null,
  })

  res.json({ job: updated })
}
