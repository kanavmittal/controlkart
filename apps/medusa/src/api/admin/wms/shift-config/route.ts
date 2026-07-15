import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"
import { WMS_MODULE } from "../../../../modules/wms"
import type WmsModuleService from "../../../../modules/wms/service"

/** Strict 24h "HH:MM" (00:00–23:59). */
export const HHMM_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

export const CreateShiftConfigSchema = z.object({
  /** 0 (Sunday) – 6 (Saturday), IST weekday. */
  weekday: z.number().int().min(0).max(6),
  start_time: z.string().regex(HHMM_PATTERN, 'must be "HH:MM" (00:00–23:59)'),
  end_time: z.string().regex(HHMM_PATTERN, 'must be "HH:MM" (00:00–23:59)'),
  active: z.boolean().optional(),
})

export const validateShiftConfigBody = <S extends z.ZodTypeAny>(
  schema: S,
  body: unknown
): z.infer<S> => {
  const result = schema.safeParse(body ?? {})
  if (!result.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      result.error.issues
        .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
        .join("; ")
    )
  }
  return result.data
}

/** List all shift windows, ordered by weekday then start time. */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const wms: WmsModuleService = req.scope.resolve(WMS_MODULE)
  const shift_configs = await wms.listShiftConfigs(
    {},
    { order: { weekday: "ASC", start_time: "ASC" } }
  )
  res.json({ shift_configs })
}

/**
 * Create a shift window. Note: end_time < start_time is legal on purpose —
 * it defines an overnight window spanning midnight into the next weekday.
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const body = validateShiftConfigBody(CreateShiftConfigSchema, req.body)

  const wms: WmsModuleService = req.scope.resolve(WMS_MODULE)
  const shift_config = await wms.createShiftConfigs({
    weekday: body.weekday,
    start_time: body.start_time,
    end_time: body.end_time,
    active: body.active ?? true,
  })

  res.status(200).json({ shift_config })
}
