import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import type { IAuthModuleService } from "@medusajs/framework/types"
import { setAuthAppMetadataStep } from "@medusajs/medusa/core-flows"
import { WMS_MODULE } from "../modules/wms"
import type WmsModuleService from "../modules/wms/service"

type CreateWarehouseStaffInput = {
  name: string
  email: string
  password: string
}

const createStaffStep = createStep(
  "create-warehouse-staff-row",
  async (input: { name: string; email: string }, { container }) => {
    const wms: WmsModuleService = container.resolve(WMS_MODULE)
    const staff = await wms.createStaff({
      name: input.name,
      email: input.email,
    })
    return new StepResponse(staff, staff.id)
  },
  async (staffId, { container }) => {
    if (!staffId) return
    const wms: WmsModuleService = container.resolve(WMS_MODULE)
    await wms.deleteStaff(staffId)
  }
)

/**
 * Staff never self-register: the admin (or dev script) supplies the password,
 * so the emailpass identity is created server-side rather than via the public
 * /auth/.../register route.
 */
const createAuthIdentityStep = createStep(
  "create-warehouse-staff-auth-identity",
  async (input: { email: string; password: string }, { container }) => {
    const auth: IAuthModuleService = container.resolve(Modules.AUTH)
    const { success, authIdentity, error } = await auth.register("emailpass", {
      body: { email: input.email, password: input.password },
    })
    if (!success || !authIdentity) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Could not create a login for ${input.email}: ${error ?? "unknown error"}`
      )
    }
    return new StepResponse(authIdentity, authIdentity.id)
  },
  async (authIdentityId, { container }) => {
    if (!authIdentityId) return
    const auth: IAuthModuleService = container.resolve(Modules.AUTH)
    await auth.deleteAuthIdentities([authIdentityId])
  }
)

export const createWarehouseStaffWorkflow = createWorkflow(
  "create-warehouse-staff",
  (input: CreateWarehouseStaffInput) => {
    const staff = createStaffStep({ name: input.name, email: input.email })
    const authIdentity = createAuthIdentityStep({
      email: input.email,
      password: input.password,
    })
    // Links the identity to the actor: app_metadata.warehouse_staff_id = staff.id,
    // which makes core /auth/warehouse_staff/emailpass issue tokens with
    // actor_id = staff.id. Step ships with its own compensation.
    setAuthAppMetadataStep({
      authIdentityId: authIdentity.id,
      actorType: "warehouse_staff",
      value: staff.id,
    })
    return new WorkflowResponse(staff)
  }
)
