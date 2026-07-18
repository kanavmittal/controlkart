import {
  AbstractNotificationProviderService,
  MedusaError,
} from "@medusajs/framework/utils"
import {
  Logger,
  ProviderSendNotificationDTO,
  ProviderSendNotificationResultsDTO,
} from "@medusajs/framework/types"
import { Resend, CreateEmailOptions } from "resend"
import * as React from "react"
import { render } from "@react-email/render"
import VerifyEmail from "./emails/verify-email"
import PasswordReset from "./emails/password-reset"

type ResendOptions = {
  channels: string[]
  api_key: string
  from: string
}

type InjectedDependencies = {
  logger: Logger
}

type EmailTemplate = {
  subject: string
  component: React.ComponentType<{ url: string }>
}

/**
 * Branded React Email templates keyed by the `template` passed to
 * `notificationModuleService.createNotifications({ template })`. The components
 * live in ./emails and are rendered to HTML + plain text at send time.
 */
const templates: Record<string, EmailTemplate> = {
  "verify-email": {
    subject: "Verify your ControlKart account",
    component: VerifyEmail,
  },
  "password-reset": {
    subject: "Reset your ControlKart password",
    component: PasswordReset,
  },
}

/**
 * Resend provider for Medusa's official Notification module. Replaces the old
 * hand-rolled raw fetch to the Resend REST API — email sending now flows through
 * the Notification module like any other Medusa notification.
 */
class ResendNotificationProviderService extends AbstractNotificationProviderService {
  static identifier = "notification-resend"
  private resendClient: Resend
  private options: ResendOptions
  private logger: Logger

  constructor({ logger }: InjectedDependencies, options: ResendOptions) {
    super()
    this.resendClient = new Resend(options.api_key)
    this.options = options
    this.logger = logger
  }

  static validateOptions(options: Record<string, unknown>) {
    if (!options.api_key) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Resend notification provider requires the `api_key` option."
      )
    }
    if (!options.from) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Resend notification provider requires the `from` option."
      )
    }
  }

  async send(
    notification: ProviderSendNotificationDTO
  ): Promise<ProviderSendNotificationResultsDTO> {
    const template = templates[notification.template]
    if (!template) {
      // Throw (not just log): returning {} makes the Notification module mark
      // the email as SUCCESS when nothing was ever sent.
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `No Resend template for "${notification.template}". ` +
          `Known templates: ${Object.keys(templates).join(", ")}`
      )
    }

    const { subject, component } = template
    const element = React.createElement(component, {
      ...(notification.data as { url: string }),
    })
    // Ship both HTML and a plain-text fallback — a text part measurably
    // improves inbox placement (spam filters penalise HTML-only mail).
    const [html, text] = await Promise.all([
      render(element),
      render(element, { plainText: true }),
    ])

    const emailOptions: CreateEmailOptions = {
      from: this.options.from,
      to: [notification.to],
      subject,
      html,
      text,
    }

    const { data, error } = await this.resendClient.emails.send(emailOptions)

    if (error || !data) {
      const detail = error ? JSON.stringify(error) : "unknown error"
      // The default onboarding@resend.dev sender is test-only: Resend rejects
      // mail to any address except the account owner's with a 403.
      const domainHint = /testing domain|verify a domain|only send to your own/i.test(
        detail
      )
        ? ` Hint: the "${this.options.from}" sender is restricted to the Resend ` +
          `account owner's email. Verify your domain at ` +
          `https://resend.com/domains and set EMAIL_FROM to an address on it.`
        : ""
      this.logger.error(
        `Resend failed to send "${notification.template}": ${detail}${domainHint}`
      )
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Resend failed to send "${notification.template}" email: ${detail}`
      )
    }

    return { id: data.id }
  }
}

export default ResendNotificationProviderService
