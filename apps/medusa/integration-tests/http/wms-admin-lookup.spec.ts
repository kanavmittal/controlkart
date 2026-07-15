/**
 * J1 — admin read-side: order warehouse status route + serial lookup route.
 *
 * Seeding goes straight through the wms module service (shipment, serial
 * units, pack record, staff, purchase order) — no order/fulfillment flow is
 * needed because both routes are read-only over wms rows + Query variant
 * resolution. The Shiprocket plugin isn't loaded (no SHIPROCKET_EMAIL), so
 * the warehouse route's tracking read degrades to null — exactly the
 * graceful path getTrackingForShipment promises.
 */
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import {
  ContainerRegistrationKeys,
  generateJwtToken,
  Modules,
} from "@medusajs/framework/utils"
import { WMS_MODULE } from "../../src/modules/wms"
import type WmsModuleService from "../../src/modules/wms/service"

jest.setTimeout(120 * 1000)

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    describe("Admin WMS lookup (order warehouse + serials)", () => {
      let headers: { headers: { authorization: string } }
      let wms: WmsModuleService

      let variant: { id: string; sku: string; title: string }
      let staffId: string
      let purchaseOrderId: string
      let orderId: string
      let shipmentId: string

      // Relative to test time: the route's "label_ready" timeline event uses
      // the shipment row's created_at (= now at seed time), so picked/packed
      // must be seeded AFTER it for the sorted timeline to be deterministic.
      const PICKED_AT = new Date(Date.now() + 60_000).toISOString()
      const PACKED_AT = new Date(Date.now() + 120_000).toISOString()

      /** Create an admin user + auth identity, then sign an admin JWT. */
      const createAdminHeaders = async () => {
        const container = getContainer()
        const email = "wms-lookup-admin@controlkart.test"

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
        const container = getContainer()
        headers = await createAdminHeaders()
        wms = container.resolve(WMS_MODULE)

        // Unique per test run — beforeEach runs against a shared DB within
        // the suite's lifecycle, and serials are unique per variant.
        const runTag = Date.now().toString(36)
        orderId = `order_lookup_${runTag}`

        const staff = await wms.createStaff({
          name: "Asha Warehouse",
          email: `asha-${runTag}@warehouse.test`,
        })
        staffId = (staff as any).id

        const productModule = container.resolve(Modules.PRODUCT)
        const product = await productModule.createProducts({
          title: "Siemens LOGO! PLC",
          status: "published",
          options: [{ title: "Model", values: [`230RCE-${runTag}`] }],
          variants: [
            {
              title: "LOGO! 230RCE",
              sku: `6ED1052-${runTag}`,
              options: { Model: `230RCE-${runTag}` },
            },
          ],
        })
        variant = (product as any).variants[0]

        const purchaseOrder = await wms.createPurchaseOrders({
          display_id: 101,
          supplier_id: "sup_lookup_test",
          status: "received",
        } as any)
        purchaseOrderId = (purchaseOrder as any).id

        // One unit still on the shelf, one picked+shipped on the order.
        await wms.createSerialUnits({
          variant_id: variant.id,
          serial: `SN-INSTOCK-${runTag}`,
          status: "in_stock",
          purchase_order_id: purchaseOrderId,
          received_by: staffId,
        } as any)
        const shippedUnit = await wms.createSerialUnits({
          variant_id: variant.id,
          serial: `SN-SHIPPED-${runTag}`,
          status: "shipped",
          purchase_order_id: purchaseOrderId,
          order_id: orderId,
          received_by: staffId,
        } as any)

        const shipment = await wms.createShipments({
          order_id: orderId,
          awb: `AWB-LOOKUP-${runTag}`,
          courier: "Mock Speed Courier",
          label_url: "https://mock.test/label.pdf",
          status: "packed",
          pick_state: {
            serials: {
              [`SN-SHIPPED-${runTag}`]: {
                variant_id: variant.id,
                serial_unit_id: (shippedUnit as any).id,
                picked_at: PICKED_AT,
              },
            },
            quantities: {},
            awb_verified_at: "2026-07-12T05:30:00.000Z",
          },
        } as any)
        shipmentId = (shipment as any).id

        await wms.createPackRecords({
          shipment_id: shipmentId,
          photo_file_id: "file_lookup_test",
          photo_url: "https://mock.test/pack-photo.jpg",
          packed_by: staffId,
          packed_at: new Date(PACKED_AT),
        } as any)
      })

      describe("GET /admin/wms/orders/:order_id/warehouse", () => {
        it("returns the shipment with picked serials, staff names, pack photo and timeline", async () => {
          const res = await api.get(
            `/admin/wms/orders/${orderId}/warehouse`,
            headers
          )
          expect(res.status).toBe(200)

          const shipment = res.data.shipment
          expect(shipment).toBeTruthy()
          expect(shipment).toMatchObject({
            id: shipmentId,
            status: "packed",
            courier: "Mock Speed Courier",
            label_url: "https://mock.test/label.pdf",
            // Plugin not loaded in this suite — tracking degrades to null.
            tracking: null,
          })
          expect(shipment.awb).toMatch(/^AWB-LOOKUP-/)

          // Picked serials grouped per variant, sku/title resolved via Query.
          expect(shipment.items).toHaveLength(1)
          expect(shipment.items[0]).toMatchObject({
            variant_id: variant.id,
            sku: variant.sku,
            title: "LOGO! 230RCE",
          })
          expect(shipment.items[0].serials).toHaveLength(1)
          expect(shipment.items[0].serials[0]).toMatchObject({
            picked_at: PICKED_AT,
            received_by: { id: staffId, name: "Asha Warehouse" },
          })
          expect(shipment.items[0].serials[0].serial).toMatch(/^SN-SHIPPED-/)

          // Pack photo with packed_by staff name resolved.
          expect(shipment.pack_photo).toMatchObject({
            photo_url: "https://mock.test/pack-photo.jpg",
            packed_at: PACKED_AT,
            packed_by: { id: staffId, name: "Asha Warehouse" },
          })

          // Timeline: label_ready (creation), picking start/end, packed —
          // in ascending order. Not fulfilled, so no fulfilled event.
          const events = shipment.timeline.map((e: any) => e.event)
          expect(events).toEqual([
            "label_ready",
            "picking_started",
            "picking_completed",
            "packed",
          ])
          const packedEvent = shipment.timeline.find(
            (e: any) => e.event === "packed"
          )
          expect(packedEvent.at).toBe(PACKED_AT)
          for (const event of shipment.timeline) {
            expect(typeof event.at).toBe("string")
          }
        })

        it("returns { shipment: null } for an order with no wms shipment", async () => {
          const res = await api.get(
            "/admin/wms/orders/order_without_shipment/warehouse",
            headers
          )
          expect(res.status).toBe(200)
          expect(res.data).toEqual({ shipment: null })
        })

        it("rejects unauthenticated requests", async () => {
          const res = await api
            .get(`/admin/wms/orders/${orderId}/warehouse`)
            .catch((e: any) => e.response)
          expect(res.status).toBe(401)
        })
      })

      describe("GET /admin/wms/serials", () => {
        it("finds a unit by exact serial with variant, PO display_id, order and staff resolved", async () => {
          const [unit] = (await wms.listSerialUnits({
            status: "shipped",
            order_id: orderId,
          })) as any[]

          const res = await api.get(
            `/admin/wms/serials?q=${encodeURIComponent(unit.serial)}`,
            headers
          )
          expect(res.status).toBe(200)
          expect(res.data.count).toBe(1)
          expect(res.data.serials[0]).toMatchObject({
            serial: unit.serial,
            status: "shipped",
            variant: {
              id: variant.id,
              sku: variant.sku,
              title: "LOGO! 230RCE",
            },
            purchase_order: { id: purchaseOrderId, display_id: 101 },
            order_id: orderId,
            received_by: { id: staffId, name: "Asha Warehouse" },
          })
          expect(res.data.serials[0].created_at).toBeTruthy()
        })

        it("does not expose order_id for an in-stock unit, and returns [] for an unknown serial", async () => {
          const [inStock] = (await wms.listSerialUnits({
            status: "in_stock",
            purchase_order_id: purchaseOrderId,
          })) as any[]

          const hit = await api.get(
            `/admin/wms/serials?q=${encodeURIComponent(inStock.serial)}`,
            headers
          )
          expect(hit.status).toBe(200)
          expect(hit.data.serials[0]).toMatchObject({
            status: "in_stock",
            order_id: null,
          })

          const miss = await api.get(
            "/admin/wms/serials?q=SN-DOES-NOT-EXIST",
            headers
          )
          expect(miss.status).toBe(200)
          expect(miss.data).toEqual({ serials: [], count: 0 })
        })

        it("lists a variant's in-stock units via ?variant_id=&status=in_stock", async () => {
          const res = await api.get(
            `/admin/wms/serials?variant_id=${variant.id}&status=in_stock`,
            headers
          )
          expect(res.status).toBe(200)
          expect(res.data.count).toBe(1)
          expect(res.data.serials[0]).toMatchObject({
            status: "in_stock",
            variant: { id: variant.id, sku: variant.sku },
          })
          expect(res.data.serials[0].serial).toMatch(/^SN-INSTOCK-/)
        })

        it("400s without q or variant_id, and 400s an invalid status", async () => {
          const missing = await api
            .get("/admin/wms/serials", headers)
            .catch((e: any) => e.response)
          expect(missing.status).toBe(400)

          const badStatus = await api
            .get(
              `/admin/wms/serials?variant_id=${variant.id}&status=bogus`,
              headers
            )
            .catch((e: any) => e.response)
          expect(badStatus.status).toBe(400)
        })

        it("rejects unauthenticated requests", async () => {
          const res = await api
            .get("/admin/wms/serials?q=SN-ANYTHING")
            .catch((e: any) => e.response)
          expect(res.status).toBe(401)
        })
      })
    })
  },
})
