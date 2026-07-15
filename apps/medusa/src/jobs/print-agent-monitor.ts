import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { WMS_MODULE } from "../modules/wms"
import type WmsModuleService from "../modules/wms/service"
import { evaluateAgentHealth, type Alert } from "../modules/wms/lib/agent-monitor"
import type { ShiftRow } from "../modules/wms/lib/shift-window"

/** The single warehouse print agent — matches AGENT_ID in the poll route. */
const AGENT_ID = "default"

const STALE_JOB_CUTOFF_MS = 10 * 60 * 1000

/**
 * Alert dedupe state, kept in memory at module scope (per H5 brief) rather
 * than persisted to the DB. This is deliberately simple: on a process
 * restart the map resets to empty, so an already-notified incident may
 * trigger one extra alert email right after a deploy/restart. Acceptable
 * for this alert (low volume, human-readable, not a duplicate-suppression
 * guarantee) — a durable store would be overkill for a 5-minute-cadence
 * ops alert.
 */
let lastAlerts: Record<string, Date> = {}

/** Set once `WMS_ALERT_EMAIL` is found unset, so the warning only logs once. */
let warnedMissingAlertEmail = false

/**
 * Every 5 minutes: checks whether the print agent is offline or has
 * released print jobs stuck without an ack, and — only during an open
 * shift window — emails `WMS_ALERT_EMAIL` via the Notification module.
 * Decision logic lives in `evaluateAgentHealth` (pure, unit tested);
 * this job is only responsible for gathering inputs and dispatching.
 */
export default async function printAgentMonitorJob(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  const alertEmail = process.env.WMS_ALERT_EMAIL
  if (!alertEmail) {
    if (!warnedMissingAlertEmail) {
      logger.warn(
        "[wms] print-agent-monitor: WMS_ALERT_EMAIL is not set — alerting is disabled."
      )
      warnedMissingAlertEmail = true
    }
    return
  }

  try {
    const now = new Date()
    const wms: WmsModuleService = container.resolve(WMS_MODULE)

    const shifts = await wms.listShiftConfigs({})

    const heartbeats = await wms.listAgentHeartbeats({ agent_id: AGENT_ID })
    const heartbeat = heartbeats[0]?.last_seen
      ? new Date(heartbeats[0].last_seen)
      : null

    const cutoff = new Date(now.getTime() - STALE_JOB_CUTOFF_MS)
    const stuckJobRows = await wms.listPrintJobs({
      status: "released",
      released_at: { $lt: cutoff },
    })
    const stuckJobs = stuckJobRows.map((job) => ({
      id: job.id,
      released_at: new Date(job.released_at as unknown as string),
    }))

    const result = evaluateAgentHealth({
      now,
      shifts: shifts as unknown as ShiftRow[],
      heartbeat,
      stuckJobs,
      lastAlerts,
    })

    lastAlerts = result.lastAlerts

    if (!result.alerts.length) {
      return
    }

    const notificationService = container.resolve(Modules.NOTIFICATION)

    for (const alert of result.alerts as Alert[]) {
      try {
        await notificationService.createNotifications([
          {
            to: alertEmail,
            channel: "email",
            // No "wms-agent-alert" template is registered yet in the
            // Resend provider's template map (src/modules/resend/service.ts)
            // — adding it is outside this task's file scope (H5 only owns
            // the 3 files listed in its brief). The provider logs and
            // no-ops on an unknown template rather than throwing, so this
            // call is safe today and will start delivering emails as soon
            // as that template is registered.
            template: "wms-agent-alert",
            data: { key: alert.key, message: alert.message },
          },
        ])
        logger.info(`[wms] print-agent-monitor: sent "${alert.key}" alert`)
      } catch (error) {
        logger.error(
          `[wms] print-agent-monitor: failed to send "${alert.key}" alert: ${
            (error as Error).message
          }`
        )
      }
    }
  } catch (error) {
    logger.error(
      `[wms] print-agent-monitor job failed: ${(error as Error).message}`
    )
  }
}

export const config = {
  name: "print-agent-monitor",
  schedule: "*/5 * * * *",
}
