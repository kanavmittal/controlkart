import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import {
  AuthWorkflowEvents,
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

type PasswordResetEventData = {
  entity_id: string
  actor_type: string
  token: string
}

/**
 * Sends the customer a password-reset email after they request one via
 * POST /auth/customer/emailpass/reset-password (the workflow emits
 * `auth.password_reset` with a 15-minute JWT).
 *
 * Backend ops: set `STOREFRONT_URL=https://controlkart.com` so the reset link
 * points at the storefront, not localhost.
 */
export default async function passwordResetHandler({
  event: { data },
  container,
}: SubscriberArgs<PasswordResetEventData>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  if (data.actor_type !== "customer" || !data.entity_id || !data.token) {
    return
  }

  const base =
    process.env.STOREFRONT_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "http://localhost:3000"
  const resetUrl = `${base}/reset-password?token=${encodeURIComponent(data.token)}`

  try {
    const notificationService = container.resolve(Modules.NOTIFICATION)
    await notificationService.createNotifications([
      {
        to: data.entity_id,
        channel: "email",
        template: "password-reset",
        data: { url: resetUrl },
      },
    ])
    logger.info(`[auth] Password-reset email sent to ${data.entity_id}`)
  } catch (error) {
    logger.error(
      `[auth] Failed to send password-reset email to ${data.entity_id}: ${
        (error as Error).message
      }`
    )
  }
}

export const config: SubscriberConfig = {
  event: AuthWorkflowEvents.PASSWORD_RESET,
}
