import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"
import { WMS_MODULE } from "../../../../../modules/wms"
import type WmsModuleService from "../../../../../modules/wms/service"

const UpdateStaffSchema = z.object({
  name: z.string().min(1).optional(),
  active: z.boolean().optional(),
})

const retrieveStaffOrThrow = async (wms: WmsModuleService, id: string) => {
  const [staff] = await wms.listStaff({ id })
  if (!staff) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Staff with id "${id}" not found.`
    )
  }
  return staff
}

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const wms: WmsModuleService = req.scope.resolve(WMS_MODULE)
  const staff = await retrieveStaffOrThrow(wms, req.params.id)
  res.json({ staff })
}

/**
 * Update name and/or the active flag (POST is Medusa's update verb — no
 * PUT/PATCH). Disabling a staff member is how you revoke access — their
 * bearer token stays cryptographically valid, but requireActiveStaff in
 * src/api/middlewares.ts 403s every /wms request once active is false.
 */
export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const result = UpdateStaffSchema.safeParse(req.body ?? {})
  if (!result.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      result.error.issues
        .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
        .join("; ")
    )
  }

  const wms: WmsModuleService = req.scope.resolve(WMS_MODULE)
  const existing = await retrieveStaffOrThrow(wms, req.params.id)

  const staff = await wms.updateStaff({
    id: existing.id,
    name: result.data.name ?? existing.name,
    active: result.data.active ?? existing.active,
  })

  res.json({ staff })
}
