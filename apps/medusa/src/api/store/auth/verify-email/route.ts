import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { findCustomerByVerifyToken } from "../../../../utils/email-verification"

/** GET /store/auth/verify-email?token=... */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const token = req.query.token as string
  if (!token) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Token is required")
  }

  const customerService = req.scope.resolve(Modules.CUSTOMER)
  const customer = await findCustomerByVerifyToken(customerService, token)

  if (!customer) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Invalid or expired verification link"
    )
  }

  const expires = customer.metadata?.verify_expires as string | undefined
  if (expires && new Date(expires) < new Date()) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Verification link has expired. Request a new one from your account."
    )
  }

  await customerService.updateCustomers(customer.id, {
    metadata: {
      ...customer.metadata,
      email_verified: true,
      verify_token: null,
      verify_expires: null,
    },
  })

  res.json({ verified: true, email: customer.email })
}
