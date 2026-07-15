import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { createWarehouseStaffWorkflow } from "../../src/workflows/create-warehouse-staff"
import { WMS_MODULE } from "../../src/modules/wms"
import type WmsModuleService from "../../src/modules/wms/service"

jest.setTimeout(120 * 1000)

const AGENT_TOKEN = "test-print-agent-token"

/* ------------------------------------------------------------------ *
 * IST helpers: shift_config rows are warehouse-local (IST) wall-clock *
 * times, so windows around "now" must be computed in IST, not in the  *
 * machine's local timezone or UTC.                                    *
 * ------------------------------------------------------------------ */

const IST_OFFSET_MINUTES = 5 * 60 + 30

const istParts = (at: Date) => {
  const shifted = new Date(at.getTime() + IST_OFFSET_MINUTES * 60 * 1000)
  return {
    weekday: shifted.getUTCDay(),
    minutesOfDay: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  }
}

const hhmm = (minutes: number): string => {
  const wrapped = ((minutes % 1440) + 1440) % 1440
  const h = String(Math.floor(wrapped / 60)).padStart(2, "0")
  const m = String(wrapped % 60).padStart(2, "0")
  return `${h}:${m}`
}

/**
 * A 2-hour window centered on "now" in IST. If start wraps behind
 * midnight the row's weekday moves to the previous IST day and the window
 * becomes an overnight one — both handled by the shift-window lib.
 */
const openWindowNow = () => {
  const { weekday, minutesOfDay } = istParts(new Date())
  const startMin = (minutesOfDay - 60 + 1440) % 1440
  return {
    weekday: startMin > minutesOfDay ? (weekday + 6) % 7 : weekday,
    start_time: hhmm(startMin),
    end_time: hhmm(minutesOfDay + 60),
    active: true,
  }
}

/** Same times, but three IST weekdays away — provably closed right now. */
const closedWindowNow = () => {
  const open = openWindowNow()
  return { ...open, weekday: (open.weekday + 3) % 7 }
}

medusaIntegrationTestRunner({
  inApp: true,
  env: { WMS_PRINT_AGENT_TOKEN: AGENT_TOKEN },
  testSuite: ({ api, getContainer }) => {
    describe("wms print queue (agent poll/ack + shift windows)", () => {
      const agentHeaders = {
        headers: { "x-print-agent-token": AGENT_TOKEN },
      }

      let wms: WmsModuleService

      beforeEach(async () => {
        wms = getContainer().resolve(WMS_MODULE)
      })

      const poll = (limit?: number, config: any = agentHeaders) =>
        api
          .post("/wms/print-agent/poll", limit ? { limit } : {}, config)
          .catch((e: any) => e.response)

      const ack = (
        jobId: string,
        body: Record<string, unknown>,
        config: any = agentHeaders
      ) =>
        api
          .post(`/wms/print-agent/jobs/${jobId}/ack`, body, config)
          .catch((e: any) => e.response)

      const createPendingJob = (labelUrl: string) =>
        wms.createPrintJobs({
          shipment_id: null,
          label_url: labelUrl,
        })

      describe("auth boundary (static token, not staff auth)", () => {
        it("401s a poll with a bad token, without creating a heartbeat", async () => {
          const res = await poll(undefined, {
            headers: { "x-print-agent-token": "wrong-token" },
          })
          expect(res.status).toBe(401)

          const heartbeats = await wms.listAgentHeartbeats({})
          expect(heartbeats).toHaveLength(0)
        })

        it("401s a poll with no token at all", async () => {
          const res = await poll(undefined, { headers: {} })
          expect(res.status).toBe(401)
        })

        it("401s a poll with a valid warehouse-staff bearer token but no agent token", async () => {
          // Proves the boundary: staff auth on /wms* neither grants access
          // to print-agent routes nor shadows the static token check.
          await createWarehouseStaffWorkflow(getContainer()).run({
            input: {
              name: "Priya",
              email: "priya@warehouse.test",
              password: "supersecret1",
            },
          })
          const login = await api.post("/auth/warehouse_staff/emailpass", {
            email: "priya@warehouse.test",
            password: "supersecret1",
          })

          const res = await poll(undefined, {
            headers: { authorization: `Bearer ${login.data.token}` },
          })
          expect(res.status).toBe(401)
        })
      })

      describe("poll inside the shift window", () => {
        it("claims atomically under concurrency: two polls never claim the same job", async () => {
          await wms.createShiftConfigs(openWindowNow())

          const jobs = await Promise.all([
            createPendingJob("https://labels.test/1.pdf"),
            createPendingJob("https://labels.test/2.pdf"),
            createPendingJob("https://labels.test/3.pdf"),
          ])

          const [resA, resB] = await Promise.all([poll(2), poll(2)])

          expect(resA.status).toBe(200)
          expect(resB.status).toBe(200)
          expect(resA.data.shift_open).toBe(true)
          expect(resB.data.shift_open).toBe(true)

          const idsA = resA.data.jobs.map((j: any) => j.id)
          const idsB = resB.data.jobs.map((j: any) => j.id)

          // 3 pending jobs, two concurrent claims of up to 2 — every job is
          // claimed exactly once: no overlap, and together they cover all 3.
          const all = [...idsA, ...idsB]
          expect(all).toHaveLength(3)
          expect(new Set(all).size).toBe(3)
          expect(new Set(all)).toEqual(new Set(jobs.map((j) => j.id)))

          // Returned shape includes what the agent needs to print.
          for (const job of [...resA.data.jobs, ...resB.data.jobs]) {
            expect(job.label_url).toMatch(/^https:\/\/labels\.test\//)
            expect(job).toHaveProperty("shipment_id")
            expect(job.attempts).toBe(0)
          }

          // All rows are now released with a release stamp; none pending.
          const released = await wms.listPrintJobs({ status: "released" })
          expect(released).toHaveLength(3)
          for (const job of released) {
            expect(job.released_at).toBeTruthy()
          }
        })

        it("caps the limit at 20 and defaults to 5", async () => {
          await wms.createShiftConfigs(openWindowNow())
          await Promise.all(
            Array.from({ length: 25 }, (_, i) =>
              createPendingJob(`https://labels.test/bulk-${i}.pdf`)
            )
          )

          const capped = await poll(50)
          expect(capped.status).toBe(200)
          expect(capped.data.jobs).toHaveLength(20)

          const defaulted = await poll()
          expect(defaulted.status).toBe(200)
          expect(defaulted.data.jobs).toHaveLength(5)
        })
      })

      describe("poll outside the shift window", () => {
        it("returns no jobs but still records the heartbeat", async () => {
          // Only a wrong-weekday row and an inactive would-be-open row —
          // the window is closed right now.
          await wms.createShiftConfigs(closedWindowNow())
          await wms.createShiftConfigs({ ...openWindowNow(), active: false })

          const job = await createPendingJob("https://labels.test/closed.pdf")

          const res = await poll()
          expect(res.status).toBe(200)
          expect(res.data).toEqual({ jobs: [], shift_open: false })

          // Job untouched.
          const [after] = await wms.listPrintJobs({ id: job.id })
          expect(after.status).toBe("pending")
          expect(after.released_at).toBeNull()

          // Heartbeat recorded anyway.
          const heartbeats = await wms.listAgentHeartbeats({})
          expect(heartbeats).toHaveLength(1)
          expect(heartbeats[0].agent_id).toBe("default")
          expect(heartbeats[0].last_seen).toBeTruthy()
        })

        it("updates (not duplicates) the heartbeat on every poll", async () => {
          await poll()
          const [first] = await wms.listAgentHeartbeats({})

          await new Promise((resolve) => setTimeout(resolve, 25))

          await poll()
          const heartbeats = await wms.listAgentHeartbeats({})
          expect(heartbeats).toHaveLength(1)
          expect(new Date(heartbeats[0].last_seen).getTime()).toBeGreaterThan(
            new Date(first.last_seen).getTime()
          )
        })
      })

      describe("ack", () => {
        it("marks a claimed job done and stamps printed_at", async () => {
          await wms.createShiftConfigs(openWindowNow())
          const job = await createPendingJob("https://labels.test/done.pdf")

          const polled = await poll(1)
          expect(polled.data.jobs.map((j: any) => j.id)).toEqual([job.id])

          const res = await ack(job.id, { status: "done" })
          expect(res.status).toBe(200)
          expect(res.data.job.status).toBe("done")
          expect(res.data.job.printed_at).toBeTruthy()

          const [after] = await wms.listPrintJobs({ id: job.id })
          expect(after.status).toBe("done")
          expect(after.printed_at).toBeTruthy()
        })

        it("re-releases failed jobs until the third failure, then keeps them failed", async () => {
          await wms.createShiftConfigs(openWindowNow())
          const job = await createPendingJob("https://labels.test/flaky.pdf")

          // Failure #1 → back to pending.
          const fail1 = await ack(job.id, {
            status: "failed",
            error: "paper jam",
          })
          expect(fail1.status).toBe(200)
          expect(fail1.data.job.status).toBe("pending")
          expect(fail1.data.job.attempts).toBe(1)
          expect(fail1.data.job.error).toBe("paper jam")

          // A later poll re-claims the re-pending job.
          const repoll = await poll(5)
          expect(repoll.data.jobs.map((j: any) => j.id)).toEqual([job.id])

          // Failure #2 → still back to pending.
          const fail2 = await ack(job.id, {
            status: "failed",
            error: "out of ribbon",
          })
          expect(fail2.data.job.status).toBe("pending")
          expect(fail2.data.job.attempts).toBe(2)

          // Failure #3 → stays failed.
          const fail3 = await ack(job.id, {
            status: "failed",
            error: "printer on fire",
          })
          expect(fail3.data.job.status).toBe("failed")
          expect(fail3.data.job.attempts).toBe(3)
          expect(fail3.data.job.error).toBe("printer on fire")

          // Dead job is not offered to the agent anymore.
          const finalPoll = await poll(5)
          expect(finalPoll.data.jobs).toEqual([])

          const [after] = await wms.listPrintJobs({ id: job.id })
          expect(after.status).toBe("failed")
        })

        it("404s an ack for an unknown job id", async () => {
          const res = await ack("wprt_does_not_exist", { status: "done" })
          expect(res.status).toBe(404)
        })

        it("400s an ack with an invalid status", async () => {
          const job = await createPendingJob("https://labels.test/bad.pdf")
          const res = await ack(job.id, { status: "exploded" })
          expect(res.status).toBe(400)
        })
      })
    })
  },
})
