import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createWarehouseStaffWorkflow } from "../workflows/create-warehouse-staff"

/**
 * Seeds a first warehouse staff login (staff row + emailpass identity),
 * without going through the admin UI. Useful for bootstrapping the very
 * first account, or scripting logins in dev/CI.
 *
 * Reads name/email/password from env vars, or positional args as a
 * fallback (in that order: name, email, password).
 *
 * Usage:
 *   WAREHOUSE_STAFF_NAME="Asha Patel" \
 *   WAREHOUSE_STAFF_EMAIL="asha@warehouse.local" \
 *   WAREHOUSE_STAFF_PASSWORD="supersecret1" \
 *   npx medusa exec ./src/scripts/create-warehouse-staff.ts
 *
 * or:
 *   npx medusa exec ./src/scripts/create-warehouse-staff.ts \
 *     "Asha Patel" asha@warehouse.local supersecret1
 */
export default async function createWarehouseStaff({
  container,
  args,
}: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  const name = process.env.WAREHOUSE_STAFF_NAME ?? args[0]
  const email = process.env.WAREHOUSE_STAFF_EMAIL ?? args[1]
  const password = process.env.WAREHOUSE_STAFF_PASSWORD ?? args[2]

  if (!name || !email || !password) {
    logger.error(
      "Missing name/email/password. Set WAREHOUSE_STAFF_NAME, " +
        "WAREHOUSE_STAFF_EMAIL, WAREHOUSE_STAFF_PASSWORD env vars, or pass " +
        "them as positional args: npx medusa exec " +
        "./src/scripts/create-warehouse-staff.ts <name> <email> <password>"
    )
    return
  }

  if (password.length < 8) {
    logger.error("Password must be at least 8 characters.")
    return
  }

  const { result: staff } = await createWarehouseStaffWorkflow(container).run(
    {
      input: { name, email, password },
    }
  )

  logger.info(
    `Created warehouse staff "${staff.name}" <${staff.email}> (id: ${staff.id}). ` +
      `They can now log in via POST /auth/warehouse_staff/emailpass.`
  )
}
