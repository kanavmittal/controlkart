import { evaluateAgentHealth } from "../agent-monitor"
import type { ShiftRow } from "../shift-window"

/**
 * Reference instants (all UTC ISO, IST = UTC+5:30, no DST):
 *   2026-07-13T05:00:00Z = Monday 10:30 IST -> inside the Mon 09:00-17:00 shift
 *   2026-07-12T05:00:00Z = Sunday 10:30 IST -> outside the Mon-only shift
 */
const OPEN_NOW = new Date("2026-07-13T05:00:00.000Z")
const CLOSED_NOW = new Date("2026-07-12T05:00:00.000Z")

const mondayNineToFive: ShiftRow = {
  weekday: 1,
  start_time: "09:00",
  end_time: "17:00",
  active: true,
}

const minutesAgo = (from: Date, minutes: number): Date =>
  new Date(from.getTime() - minutes * 60 * 1000)

describe("evaluateAgentHealth", () => {
  it("emits no alerts when the shift window is closed, even if the agent is offline", () => {
    const result = evaluateAgentHealth({
      now: CLOSED_NOW,
      shifts: [mondayNineToFive],
      heartbeat: null,
      stuckJobs: [
        { id: "wprt_1", released_at: minutesAgo(CLOSED_NOW, 30) },
      ],
      lastAlerts: {},
    })

    expect(result.alerts).toEqual([])
    expect(result.lastAlerts).toEqual({})
  })

  it("emits agent-offline when the shift is open and the heartbeat is stale (>10 min)", () => {
    const heartbeat = minutesAgo(OPEN_NOW, 11)

    const result = evaluateAgentHealth({
      now: OPEN_NOW,
      shifts: [mondayNineToFive],
      heartbeat,
      stuckJobs: [],
      lastAlerts: {},
    })

    expect(result.alerts).toEqual([
      expect.objectContaining({ key: "agent-offline" }),
    ])
    expect(result.lastAlerts["agent-offline"]).toEqual(OPEN_NOW)
  })

  it("emits agent-offline when the shift is open and the heartbeat is null", () => {
    const result = evaluateAgentHealth({
      now: OPEN_NOW,
      shifts: [mondayNineToFive],
      heartbeat: null,
      stuckJobs: [],
      lastAlerts: {},
    })

    expect(result.alerts).toEqual([
      expect.objectContaining({ key: "agent-offline" }),
    ])
    expect(result.lastAlerts["agent-offline"]).toEqual(OPEN_NOW)
  })

  it("does not emit agent-offline when the heartbeat is recent", () => {
    const heartbeat = minutesAgo(OPEN_NOW, 2)

    const result = evaluateAgentHealth({
      now: OPEN_NOW,
      shifts: [mondayNineToFive],
      heartbeat,
      stuckJobs: [],
      lastAlerts: {},
    })

    expect(result.alerts).toEqual([])
  })

  it("emits jobs-stuck with the count and oldest age when jobs are released and unacknowledged for >10 min", () => {
    const stuckJobs = [
      { id: "wprt_1", released_at: minutesAgo(OPEN_NOW, 12) },
      { id: "wprt_2", released_at: minutesAgo(OPEN_NOW, 47) },
    ]

    const result = evaluateAgentHealth({
      now: OPEN_NOW,
      shifts: [mondayNineToFive],
      heartbeat: OPEN_NOW,
      stuckJobs,
      lastAlerts: {},
    })

    expect(result.alerts).toEqual([
      expect.objectContaining({
        key: "jobs-stuck",
        message: expect.stringContaining("2"),
      }),
    ])
    expect(result.alerts[0].message).toContain("47")
    expect(result.lastAlerts["jobs-stuck"]).toEqual(OPEN_NOW)
  })

  it("emits both agent-offline and jobs-stuck when both conditions hold", () => {
    const result = evaluateAgentHealth({
      now: OPEN_NOW,
      shifts: [mondayNineToFive],
      heartbeat: null,
      stuckJobs: [{ id: "wprt_1", released_at: minutesAgo(OPEN_NOW, 20) }],
      lastAlerts: {},
    })

    expect(result.alerts.map((a) => a.key).sort()).toEqual([
      "agent-offline",
      "jobs-stuck",
    ])
  })

  it("dedupes: does not re-emit the same alert key within 60 minutes", () => {
    const first = evaluateAgentHealth({
      now: OPEN_NOW,
      shifts: [mondayNineToFive],
      heartbeat: null,
      stuckJobs: [],
      lastAlerts: {},
    })
    expect(first.alerts).toHaveLength(1)

    const thirtyMinLater = minutesAgo(OPEN_NOW, -30) // 30 min after OPEN_NOW
    const second = evaluateAgentHealth({
      now: thirtyMinLater,
      shifts: [mondayNineToFive],
      heartbeat: null,
      stuckJobs: [],
      lastAlerts: first.lastAlerts,
    })

    expect(second.alerts).toEqual([])
    expect(second.lastAlerts).toEqual(first.lastAlerts)
  })

  it("re-emits the same alert key after 61 minutes", () => {
    const sixtyOneMinAgo = minutesAgo(OPEN_NOW, 61)

    const result = evaluateAgentHealth({
      now: OPEN_NOW,
      shifts: [mondayNineToFive],
      heartbeat: null,
      stuckJobs: [],
      lastAlerts: { "agent-offline": sixtyOneMinAgo },
    })

    expect(result.alerts).toEqual([
      expect.objectContaining({ key: "agent-offline" }),
    ])
    expect(result.lastAlerts["agent-offline"]).toEqual(OPEN_NOW)
  })

  it("does not emit and does not bump lastAlerts when the heartbeat has recovered", () => {
    const priorAlertAt = minutesAgo(OPEN_NOW, 45) // within the last 60 min
    const recentHeartbeat = minutesAgo(OPEN_NOW, 1)

    const result = evaluateAgentHealth({
      now: OPEN_NOW,
      shifts: [mondayNineToFive],
      heartbeat: recentHeartbeat,
      stuckJobs: [],
      lastAlerts: { "agent-offline": priorAlertAt },
    })

    expect(result.alerts).toEqual([])
    expect(result.lastAlerts["agent-offline"]).toEqual(priorAlertAt)
  })
})
