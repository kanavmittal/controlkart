/**
 * Pure-logic decision function for the print-agent heartbeat monitor (H5).
 *
 * Decides *whether* to alert, given a snapshot of the world at `now` — it
 * performs no I/O (no DB, no email, no clock reads) so it can be unit
 * tested deterministically with an injected clock. The scheduled job
 * (`src/jobs/print-agent-monitor.ts`) is the only caller, and is
 * responsible for gathering the inputs and actually sending alerts.
 *
 * No Medusa / module / framework imports on purpose, mirroring
 * `shift-window.ts` — stays a plain, dependency-free TypeScript library.
 */

import { isShiftOpen, type ShiftRow } from "./shift-window"

const STALE_HEARTBEAT_MS = 10 * 60 * 1000
const STUCK_JOB_MS = 10 * 60 * 1000
const DEDUPE_WINDOW_MS = 60 * 60 * 1000

export type AlertKey = "agent-offline" | "jobs-stuck"

export type Alert = {
  key: AlertKey
  message: string
}

export type StuckJob = {
  id: string
  released_at: Date
}

export type EvaluateAgentHealthInput = {
  now: Date
  shifts: ShiftRow[]
  /** Last recorded heartbeat for the print agent, or null if it has never polled. */
  heartbeat: Date | null
  /**
   * Print jobs already known to be `released` and unacknowledged for longer
   * than the stuck-job threshold (the caller does the DB filtering; this fn
   * just decides whether to alert on what it's given).
   */
  stuckJobs: StuckJob[]
  /** Last emission time per alert key, carried across runs for dedupe. */
  lastAlerts: Record<string, Date>
}

export type EvaluateAgentHealthResult = {
  alerts: Alert[]
  lastAlerts: Record<string, Date>
}

function minutesBetween(later: Date, earlier: Date): number {
  return Math.floor((later.getTime() - earlier.getTime()) / 60000)
}

/**
 * Evaluates print-agent health at `input.now` and decides which alerts (if
 * any) should be emitted, applying the 60-minute per-key dedupe window.
 *
 * Rules:
 * - Alerts only fire during an OPEN shift window (`isShiftOpen`). Outside a
 *   shift, this returns no alerts and leaves `lastAlerts` untouched — an
 *   idle agent overnight is expected, not an incident.
 * - `agent-offline`: heartbeat is `null`, or older than 10 minutes.
 * - `jobs-stuck`: one or more jobs in `stuckJobs` (message includes the
 *   count and the oldest job's age in minutes).
 * - Dedupe: a given alert `key` won't be re-emitted more than once per 60
 *   minutes. If the condition no longer holds (e.g. heartbeat recovered),
 *   `lastAlerts[key]` is left exactly as-is — it's only ever bumped at the
 *   moment an alert is actually emitted.
 */
export function evaluateAgentHealth(
  input: EvaluateAgentHealthInput
): EvaluateAgentHealthResult {
  const { now, shifts, heartbeat, stuckJobs, lastAlerts } = input

  if (!isShiftOpen(shifts, now)) {
    return { alerts: [], lastAlerts }
  }

  const alerts: Alert[] = []
  const updatedLastAlerts: Record<string, Date> = { ...lastAlerts }

  const shouldEmit = (key: AlertKey): boolean => {
    const last = lastAlerts[key]
    return !last || now.getTime() - last.getTime() >= DEDUPE_WINDOW_MS
  }

  const heartbeatAgeMs = heartbeat ? now.getTime() - heartbeat.getTime() : null
  const isOffline =
    heartbeat === null ||
    (heartbeatAgeMs !== null && heartbeatAgeMs > STALE_HEARTBEAT_MS)

  if (isOffline && shouldEmit("agent-offline")) {
    const message =
      heartbeat === null
        ? "Print agent has never sent a heartbeat."
        : `Print agent heartbeat is stale: last seen ${minutesBetween(
            now,
            heartbeat
          )} min ago.`
    alerts.push({ key: "agent-offline", message })
    updatedLastAlerts["agent-offline"] = now
  }

  const stuck = stuckJobs.filter(
    (job) => now.getTime() - job.released_at.getTime() > STUCK_JOB_MS
  )

  if (stuck.length > 0 && shouldEmit("jobs-stuck")) {
    const oldest = stuck.reduce((min, job) =>
      job.released_at.getTime() < min.released_at.getTime() ? job : min
    )
    const message = `${stuck.length} print job(s) released but unacknowledged for over 10 minutes (oldest: ${minutesBetween(
      now,
      oldest.released_at
    )} min).`
    alerts.push({ key: "jobs-stuck", message })
    updatedLastAlerts["jobs-stuck"] = now
  }

  return { alerts, lastAlerts: updatedLastAlerts }
}
