import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import {
  ContainerRegistrationKeys,
  generateJwtToken,
  Modules,
} from "@medusajs/framework/utils"
import { WMS_MODULE } from "../../src/modules/wms"
import type WmsModuleService from "../../src/modules/wms/service"

jest.setTimeout(120 * 1000)

const MINUTE_MS = 60 * 1000

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    describe("Admin WMS print queue + low stock", () => {
      let headers: { headers: { authorization: string } }
      let wms: WmsModuleService

      /** Create an admin user + auth identity, then sign an admin JWT. */
      const createAdminHeaders = async () => {
        const container = getContainer()
        const email = "wms-print-admin@controlkart.test"

        const userModule = container.resolve(Modules.USER)
        const user = await userModule.createUsers({ email })

        const authModule = container.resolve(Modules.AUTH)
        const authIdentity = await authModule.createAuthIdentities({
          provider_identities: [{ provider: "emailpass", entity_id: email }],
          app_metadata: { user_id: user.id },
        })

        const { projectConfig } = container.resolve(
          ContainerRegistrationKeys.CONFIG_MODULE
        )
        const token = generateJwtToken(
          {
            actor_id: user.id,
            actor_type: "user",
            auth_identity_id: authIdentity.id,
            app_metadata: { user_id: user.id },
          },
          {
            secret: projectConfig.http.jwtSecret as string,
            expiresIn: "1d",
          }
        )

        return { headers: { authorization: `Bearer ${token}` } }
      }

      beforeEach(async () => {
        wms = getContainer().resolve(WMS_MODULE)
        headers = await createAdminHeaders()
      })

      const listJobs = (qs = "", config: any = headers) =>
        api
          .get(`/admin/wms/print-jobs${qs}`, config)
          .catch((e: any) => e.response)

      const reprint = (jobId: string, config: any = headers) =>
        api
          .post(`/admin/wms/print-jobs/${jobId}/reprint`, {}, config)
          .catch((e: any) => e.response)

      const lowStock = (qs = "", config: any = headers) =>
        api
          .get(`/admin/wms/low-stock${qs}`, config)
          .catch((e: any) => e.response)

      const heartbeatAt = (agoMs: number) =>
        wms.createAgentHeartbeats({
          agent_id: "default",
          last_seen: new Date(Date.now() - agoMs),
        })

      describe("auth", () => {
        it("401s non-admin requests on every route", async () => {
          const noAuth = { headers: {} }

          expect((await listJobs("", noAuth)).status).toBe(401)
          expect((await lowStock("", noAuth)).status).toBe(401)

          const job = await wms.createPrintJobs({
            shipment_id: null,
            label_url: "https://labels.test/a.pdf",
          })
          expect((await reprint(job.id, noAuth)).status).toBe(401)
        })
      })

      describe("print job list", () => {
        it("lists newest first with shipment awb/order_id joined, and filters by status", async () => {
          const shipment = await wms.createShipments({
            order_id: "order_test_1",
            awb: "AWB-19012345",
          })

          const oldest = await wms.createPrintJobs({
            shipment_id: null,
            label_url: "https://labels.test/oldest.pdf",
          })
          await new Promise((resolve) => setTimeout(resolve, 15))
          const middle = await wms.createPrintJobs({
            shipment_id: shipment.id,
            label_url: "https://labels.test/middle.pdf",
          })
          await new Promise((resolve) => setTimeout(resolve, 15))
          const newest = await wms.createPrintJobs({
            shipment_id: null,
            label_url: "https://labels.test/newest.pdf",
          })
          await wms.updatePrintJobs({
            id: newest.id,
            status: "failed",
            attempts: 3,
            error: "printer on fire",
          })

          const res = await listJobs()
          expect(res.status).toBe(200)
          expect(res.data.count).toBe(3)
          expect(res.data.jobs.map((j: any) => j.id)).toEqual([
            newest.id,
            middle.id,
            oldest.id,
          ])

          // Shipment join.
          const joined = res.data.jobs.find((j: any) => j.id === middle.id)
          expect(joined.awb).toBe("AWB-19012345")
          expect(joined.order_id).toBe("order_test_1")

          // Jobs without a shipment carry nulls.
          const bare = res.data.jobs.find((j: any) => j.id === oldest.id)
          expect(bare.awb).toBeNull()
          expect(bare.order_id).toBeNull()

          // Status filter.
          const failed = await listJobs("?status=failed")
          expect(failed.status).toBe(200)
          expect(failed.data.count).toBe(1)
          expect(failed.data.jobs).toHaveLength(1)
          expect(failed.data.jobs[0]).toMatchObject({
            id: newest.id,
            status: "failed",
            attempts: 3,
            error: "printer on fire",
          })

          const pending = await listJobs("?status=pending")
          expect(pending.data.count).toBe(2)

          const bogus = await listJobs("?status=exploded")
          expect(bogus.status).toBe(400)
        })
      })

      describe("agent state buckets", () => {
        it("is red with a null last_seen when the agent has never polled", async () => {
          const res = await listJobs()
          expect(res.status).toBe(200)
          expect(res.data.agent).toEqual({ last_seen: null, state: "red" })
        })

        it("is green when last seen under 5 minutes ago", async () => {
          await heartbeatAt(2 * MINUTE_MS)
          const res = await listJobs()
          expect(res.data.agent.state).toBe("green")
          expect(res.data.agent.last_seen).toBeTruthy()
        })

        it("is amber when last seen between 5 and 15 minutes ago", async () => {
          await heartbeatAt(10 * MINUTE_MS)
          const res = await listJobs()
          expect(res.data.agent.state).toBe("amber")
        })

        it("is red when last seen over 15 minutes ago", async () => {
          await heartbeatAt(25 * MINUTE_MS)
          const res = await listJobs()
          expect(res.data.agent.state).toBe("red")
        })
      })

      describe("reprint", () => {
        it("clones the job as a new pending one and never mutates the original", async () => {
          const shipment = await wms.createShipments({
            order_id: "order_reprint_1",
            awb: "AWB-REPRINT",
          })
          const source = await wms.createPrintJobs({
            shipment_id: shipment.id,
            label_url: "https://labels.test/reprint.pdf",
          })
          await wms.updatePrintJobs({
            id: source.id,
            status: "failed",
            attempts: 3,
            error: "paper jam",
          })

          const res = await reprint(source.id)
          expect(res.status).toBe(201)
          expect(res.data.job.id).not.toBe(source.id)
          expect(res.data.job).toMatchObject({
            status: "pending",
            attempts: 0,
            label_url: "https://labels.test/reprint.pdf",
            shipment_id: shipment.id,
          })
          expect(res.data.job.error).toBeNull()

          // Original untouched — audit trail preserved.
          const [original] = await wms.listPrintJobs({ id: source.id })
          expect(original.status).toBe("failed")
          expect(original.attempts).toBe(3)
          expect(original.error).toBe("paper jam")

          // Both rows exist now.
          const all = await wms.listPrintJobs({})
          expect(all).toHaveLength(2)
        })

        it("400s when the source job has an empty label_url", async () => {
          const source = await wms.createPrintJobs({
            shipment_id: null,
            label_url: "",
          })

          const res = await reprint(source.id)
          expect(res.status).toBe(400)

          // No clone was created.
          const all = await wms.listPrintJobs({})
          expect(all).toHaveLength(1)
        })

        it("404s an unknown job id", async () => {
          const res = await reprint("wprt_does_not_exist")
          expect(res.status).toBe(404)
        })
      })

      describe("low stock", () => {
        let locationId: string
        let inventoryModule: any

        /**
         * Seed a published product with three variants wired to inventory
         * items (bare module-level creation doesn't do that automatically):
         * - LOW-0:     stocked 2, reserved 2 → available 0 (default threshold)
         * - OK-5:      stocked 5, reserved 0 → available 5 (default threshold)
         * - THRESH-10: stocked 5, reserved 0, metadata threshold 10
         * Plus a draft product whose variant must never appear.
         */
        const seedInventory = async () => {
          const container = getContainer()
          inventoryModule = container.resolve(Modules.INVENTORY)
          const stockLocationModule: any = container.resolve(
            Modules.STOCK_LOCATION
          )
          const link = container.resolve(ContainerRegistrationKeys.LINK)
          const productModule = container.resolve(Modules.PRODUCT)

          const [location] = await stockLocationModule.createStockLocations([
            { name: "Low Stock Test Warehouse" },
          ])
          locationId = location.id

          const product = await productModule.createProducts({
            title: "Siemens Breaker",
            status: "published",
            options: [{ title: "Kind", values: ["Low", "Ok", "Thresh"] }],
            variants: [
              { title: "Low unit", sku: "LOW-0", options: { Kind: "Low" } },
              { title: "Ok unit", sku: "OK-5", options: { Kind: "Ok" } },
              {
                title: "Threshold unit",
                sku: "THRESH-10",
                options: { Kind: "Thresh" },
                metadata: { low_stock_threshold: 10 },
              },
            ],
          })
          const draftProduct = await productModule.createProducts({
            title: "Unreleased Relay",
            status: "draft",
            options: [{ title: "Kind", values: ["Draft"] }],
            variants: [
              { title: "Draft unit", sku: "DRAFT-0", options: { Kind: "Draft" } },
            ],
          })

          const variants = await productModule.listProductVariants({
            product_id: [product.id, draftProduct.id],
          })

          const links: any[] = []
          const itemBySku = new Map<string, any>()
          for (const variant of variants) {
            const item = await inventoryModule.createInventoryItems({
              sku: variant.sku,
            })
            itemBySku.set(variant.sku as string, item)
            links.push({
              [Modules.PRODUCT]: { variant_id: variant.id },
              [Modules.INVENTORY]: { inventory_item_id: item.id },
            })
          }
          await link.create(links)

          const level = (sku: string, stocked: number) =>
            inventoryModule.createInventoryLevels({
              inventory_item_id: itemBySku.get(sku).id,
              location_id: locationId,
              stocked_quantity: stocked,
            })

          await level("LOW-0", 2)
          await level("OK-5", 5)
          await level("THRESH-10", 5)
          await level("DRAFT-0", 0)

          // Reserve 2 of LOW-0 → available drops to 0.
          await inventoryModule.createReservationItems({
            inventory_item_id: itemBySku.get("LOW-0").id,
            location_id: locationId,
            quantity: 2,
          })
        }

        it("reports available<=threshold for published variants only, honoring metadata thresholds", async () => {
          await seedInventory()

          const res = await lowStock()
          expect(res.status).toBe(200)
          expect(res.data.count).toBe(2)

          const skus = res.data.variants.map((v: any) => v.sku)
          expect(skus).toEqual(["LOW-0", "THRESH-10"]) // sorted by available asc
          expect(skus).not.toContain("OK-5") // available 5 > threshold 0
          expect(skus).not.toContain("DRAFT-0") // not published

          const low = res.data.variants.find((v: any) => v.sku === "LOW-0")
          expect(low).toMatchObject({
            sku: "LOW-0",
            title: "Low unit",
            product_title: "Siemens Breaker",
            available: 0,
            stocked: 2,
            reserved: 2,
            threshold: 0,
          })
          expect(low.variant_id).toBeTruthy()

          const thresh = res.data.variants.find(
            (v: any) => v.sku === "THRESH-10"
          )
          expect(thresh).toMatchObject({
            available: 5,
            stocked: 5,
            reserved: 0,
            threshold: 10,
          })
        })

        it("supports limit/offset pagination over the filtered rows", async () => {
          await seedInventory()

          const first = await lowStock("?limit=1&offset=0")
          expect(first.status).toBe(200)
          expect(first.data.count).toBe(2)
          expect(first.data.variants).toHaveLength(1)
          expect(first.data.variants[0].sku).toBe("LOW-0")

          const second = await lowStock("?limit=1&offset=1")
          expect(second.data.count).toBe(2)
          expect(second.data.variants).toHaveLength(1)
          expect(second.data.variants[0].sku).toBe("THRESH-10")

          const beyond = await lowStock("?limit=1&offset=2")
          expect(beyond.data.variants).toHaveLength(0)
        })
      })
    })
  },
})
