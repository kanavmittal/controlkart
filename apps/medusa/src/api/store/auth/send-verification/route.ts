import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
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
  try {
    await notificationService.createNotifications([
      {
        to: customer.email,
        channel: "email",
        template: "verify-email",
        data: { url: verifyUrl },
      },
    ])
  } catch (error) {
    // Delivery is down (e.g. unverified Resend sender domain) — don't strand
    // the user on an unverifiable account: hand the link back to the
    // authenticated account owner so they can still verify.
    const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
    logger.error(
      `[auth] Verification email to ${customer.email} failed to send: ${
        (error as Error).message
      }`
    )
    res.json({ sent: false, send_failed: true, verify_url: verifyUrl })
    return
  }

  res.json({
    sent: true,
    verify_url: process.env.RESEND_API_KEY ? undefined : verifyUrl,
  })
}
