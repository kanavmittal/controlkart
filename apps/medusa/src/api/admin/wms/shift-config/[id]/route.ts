import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"
import { WMS_MODULE } from "../../../../../modules/wms"
import type WmsModuleService from "../../../../../modules/wms/service"
import { HHMM_PATTERN, validateShiftConfigBody } from "../route"

const UpdateShiftConfigSchema = z.object({
  weekday: z.number().int().min(0).max(6).optional(),
  start_time: z
    .string()
    .regex(HHMM_PATTERN, 'must be "HH:MM" (00:00–23:59)')
    .optional(),
  end_time: z
    .string()
    .regex(HHMM_PATTERN, 'must be "HH:MM" (00:00–23:59)')
    .optional(),
  active: z.boolean().optional(),
})

const retrieveShiftConfigOrThrow = async (
  wms: WmsModuleService,
  id: string
) => {
  const [shiftConfig] = await wms.listShiftConfigs({ id })
  if (!shiftConfig) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Shift config with id "${id}" was not found`
    )
  }
  return shiftConfig
}

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const wms: WmsModuleService = req.scope.resolve(WMS_MODULE)
  const shift_config = await retrieveShiftConfigOrThrow(wms, req.params.id)
  res.json({ shift_config })
}

/** Partial update (POST is Medusa's update verb — no PUT/PATCH). */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const body = validateShiftConfigBody(UpdateShiftConfigSchema, req.body)

  const wms: WmsModuleService = req.scope.resolve(WMS_MODULE)
  const existing = await retrieveShiftConfigOrThrow(wms, req.params.id)

  const shift_config = await wms.updateShiftConfigs({
    id: existing.id,
    weekday: body.weekday ?? existing.weekday,
    start_time: body.start_time ?? existing.start_time,
    end_time: body.end_time ?? existing.end_time,
    active: body.active ?? existing.active,
  })

  res.json({ shift_config })
}

export async function DELETE(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const wms: WmsModuleService = req.scope.resolve(WMS_MODULE)
  const existing = await retrieveShiftConfigOrThrow(wms, req.params.id)

  await wms.deleteShiftConfigs(existing.id)

  res.json({ id: existing.id, object: "shift_config", deleted: true })
}
