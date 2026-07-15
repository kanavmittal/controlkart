/**
 * I4 — tracking read-side over the Shiprocket plugin's own tracking module.
 *
 * The Shiprocket plugin's HTTP client is mocked at its public subpath
 * (`@sam-ael/medusa-plugin-shiprocket/providers/shiprocket/client`) so
 * nothing in this suite does live HTTP to Shiprocket, even accidentally
 * (e.g. via the plugin's scheduled token-refresh job) — see
 * `wms-shipment-create.spec.ts` for the same pattern and its rationale.
 */
jest.mock(
  "@sam-ael/medusa-plugin-shiprocket/providers/shiprocket/client",
  () => {
    return {
      __esModule: true,
      default: jest.fn().mockImplementation(() => ({
        create: jest.fn(),
        createDocuments: jest.fn(),
        cancel: jest.fn(),
        calculate: jest.fn(),
        dispose: jest.fn(),
      })),
    }
  }
)

import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import {
  getTrackingForShipment,
  mapTrackingToStatus,
  SHIPROCKET_TRACKING_MODULE,
  type ShiprocketTrackingRow,
} from "../../src/modules/wms/lib/tracking-read"

// See wms-shipment-create.spec.ts: medusaIntegrationTestRunner's `env`
// option is applied too late for medusa-config.ts's `plugins` array, which
// gates the whole Shiprocket plugin (and therefore its shiprocket-tracking
// module) on `process.env.SHIPROCKET_EMAIL` at module-array-construction
// time. Set the vars at module scope, before Jest's collection phase hands
// off to any `beforeAll`.
process.env.SHIPROCKET_EMAIL = "dummy@test.dev"
process.env.SHIPROCKET_PASSWORD = "dummy"

jest.setTimeout(120 * 1000)

/** Minimal shape of the plugin's tracking module service this spec needs
 * for seeding — the plugin ships no `.d.ts`, so this is typed locally
 * (same approach `tracking-read.ts` takes for its own dependency). */
interface ShiprocketTrackingServiceLike {
  upsertByAwb(data: {
    awb: string
    current_status: string
    shipment_status?: string | null
    courier_name?: string | null
  }): Promise<ShiprocketTrackingRow>
}

medusaIntegrationTestRunner({
  inApp: true,
  env: {
    SHIPROCKET_EMAIL: "dummy@test.dev",
    SHIPROCKET_PASSWORD: "dummy",
  },
  testSuite: ({ getContainer }) => {
    describe("wms tracking read-side (Shiprocket plugin module)", () => {
      it("resolves the plugin's tracking module from the container", () => {
        const container = getContainer()
        expect(() => container.resolve(SHIPROCKET_TRACKING_MODULE)).not.toThrow()
      })

      it("returns the seeded tracking row for a shipment's AWB, bucketed by mapTrackingToStatus", async () => {
        const container = getContainer()
        const trackingService: ShiprocketTrackingServiceLike = container.resolve(
          SHIPROCKET_TRACKING_MODULE
        )

        const seeded = await trackingService.upsertByAwb({
          awb: "AWBTESTOFD001",
          current_status: "OUTFORDELIVERY",
          shipment_status: "OUTFORDELIVERY",
          courier_name: "Test Speed Courier",
        })
        expect(seeded.id).toBeTruthy()

        const row = await getTrackingForShipment(container, {
          awb: "AWBTESTOFD001",
        })

        expect(row).not.toBeNull()
        expect(row!.id).toBe(seeded.id)
        expect(row!.awb).toBe("AWBTESTOFD001")
        expect(row!.current_status).toBe("OUTFORDELIVERY")

        expect(mapTrackingToStatus(row)).toBe("out_for_delivery")
      })

      it("buckets a delivered row as delivered and an RTO row as rto (not delivered)", async () => {
        const container = getContainer()
        const trackingService: ShiprocketTrackingServiceLike = container.resolve(
          SHIPROCKET_TRACKING_MODULE
        )

        await trackingService.upsertByAwb({
          awb: "AWBTESTDLV001",
          current_status: "DELIVERED",
        })
        await trackingService.upsertByAwb({
          awb: "AWBTESTRTO001",
          current_status: "RTODELIVERED",
        })

        const delivered = await getTrackingForShipment(container, {
          awb: "AWBTESTDLV001",
        })
        const rto = await getTrackingForShipment(container, {
          awb: "AWBTESTRTO001",
        })

        expect(mapTrackingToStatus(delivered)).toBe("delivered")
        expect(mapTrackingToStatus(rto)).toBe("rto")
      })

      it("returns null for a shipment whose AWB has no tracking row", async () => {
        const container = getContainer()

        const row = await getTrackingForShipment(container, {
          awb: "AWB-DOES-NOT-EXIST",
        })

        expect(row).toBeNull()
        expect(mapTrackingToStatus(row)).toBeNull()
      })

      it("returns null for a shipment with no AWB yet, without touching the tracking module", async () => {
        const container = getContainer()

        const row = await getTrackingForShipment(container, { awb: null })

        expect(row).toBeNull()
      })
    })
  },
})
