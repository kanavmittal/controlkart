import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { WMS_MODULE } from "../../../modules/wms"
import type WmsModuleService from "../../../modules/wms/service"

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const wms: WmsModuleService = req.scope.resolve(WMS_MODULE)
  const staff = await wms.retrieveStaff(req.auth_context.actor_id)

  res.json({
    staff: {
      id: staff.id,
      name: staff.name,
      email: staff.email,
      active: staff.active,
      created_at: staff.created_at,
    },
  })
}
