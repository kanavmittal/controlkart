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

type ResendOptions = {
  channels: string[]
  api_key: string
  from: string
}

type InjectedDependencies = {
  logger: Logger
}

type RenderedEmail = { subject: string; html: string }
type TemplateFn = (data: Record<string, unknown>) => RenderedEmail

/**
 * Email templates keyed by the `template` passed to
 * `notificationModuleService.createNotifications({ template })`. Plain HTML
 * (no React Email dependency) — these are simple transactional emails.
 */
const templates: Record<string, TemplateFn> = {
  "verify-email": (data) => ({
    subject: "Verify your ControlKart account",
    html:
      `<p>Please verify your email to complete registration.</p>` +
      `<p><a href="${data.url}">Verify email</a></p>` +
      `<p>This link expires in 24 hours.</p>`,
  }),
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
    const render = templates[notification.template]
    if (!render) {
      this.logger.error(
        `No Resend template for "${notification.template}". ` +
          `Known templates: ${Object.keys(templates).join(", ")}`
      )
      return {}
    }

    const { subject, html } = render(
      (notification.data ?? {}) as Record<string, unknown>
    )

    const emailOptions: CreateEmailOptions = {
      from: this.options.from,
      to: [notification.to],
      subject,
      html,
    }

    const { data, error } = await this.resendClient.emails.send(emailOptions)

    if (error || !data) {
      this.logger.error(
        `Resend failed to send "${notification.template}": ${
          error ? JSON.stringify(error) : "unknown error"
        }`
      )
      return {}
    }

    return { id: data.id }
  }
}

export default ResendNotificationProviderService
