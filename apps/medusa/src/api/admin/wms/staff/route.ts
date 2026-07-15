import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"
import { WMS_MODULE } from "../../../../modules/wms"
import type WmsModuleService from "../../../../modules/wms/service"
import { createWarehouseStaffWorkflow } from "../../../../workflows/create-warehouse-staff"

const CreateStaffSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
})

/** List all warehouse staff (active + disabled), newest first. */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const wms: WmsModuleService = req.scope.resolve(WMS_MODULE)
  const staff = await wms.listStaff({}, { order: { created_at: "DESC" } })
  res.json({ staff })
}

/** Create a staff row + emailpass login via createWarehouseStaffWorkflow. */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const result = CreateStaffSchema.safeParse(req.body ?? {})
  if (!result.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      result.error.issues
        .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
        .join("; ")
    )
  }

  const { result: staff } = await createWarehouseStaffWorkflow(req.scope).run({
    input: result.data,
  })

  res.status(200).json({ staff })
}
