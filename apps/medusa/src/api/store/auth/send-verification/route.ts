import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import {
  buildVerifyUrl,
  issueVerificationToken,
} from "../../../../utils/email-verification"

/** POST /store/auth/send-verification */
export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const customerService = req.scope.resolve(Modules.CUSTOMER)
  const customer = await customerService.retrieveCustomer(
    req.auth_context.actor_id
  )

  if (customer.metadata?.email_verified === true) {
    res.json({ sent: false, already_verified: true })
    return
  }

  const token = await issueVerificationToken(
    customerService,
    customer.id,
    (customer.metadata ?? {}) as Record<string, unknown>
  )

  const verifyUrl = buildVerifyUrl(token)

  const notificationService = req.scope.resolve(Modules.NOTIFICATION)
  await notificationService.createNotifications([
    {
      to: customer.email,
      channel: "email",
      template: "verify-email",
      data: { url: verifyUrl },
    },
  ])

  res.json({
    sent: true,
    verify_url: process.env.RESEND_API_KEY ? undefined : verifyUrl,
  })
}
