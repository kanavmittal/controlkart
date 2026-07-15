/**
 * H7 — outbound commit path (pack -> ship).
 *
 * Seeding mirrors wms-pick.spec.ts / wms-shipment-create.spec.ts: the
 * Shiprocket plugin's HTTP client is mocked at its public subpath so
 * createShipmentWorkflow exercises the real plugin provider end-to-end (real
 * core steps, real inventory adjustments) with zero live HTTP to Shiprocket,
 * giving us a real `label_ready` shipment with an AWB. `mockSchedulePickup`
 * (name intentionally "mock"-prefixed — required by the jest.mock hoist
 * restriction on out-of-scope variable access) is shared by every
 * constructed client instance so each test can control the pack-and-ship
 * workflow's pickup-scheduling step independently of shipment creation.
 */
const mockSchedulePickup = jest.fn().mockResolvedValue(true)

jest.mock(
  "@sam-ael/medusa-plugin-shiprocket/providers/shiprocket/client",
  () => {
    return {
      __esModule: true,
      default: jest.fn().mockImplementation(() => ({
        create: jest.fn().mockResolvedValue({
          order_id: 9988776,
          shipment_id: 5544332,
          status: "NEW",
          status_code: 1,
          awb: "MOCKAWB-SHIP-1",
          courier_company_id: 51,
          courier_name: "Mock Speed Courier",
          tracking_number: "MOCKAWB-SHIP-1",
          tracking_url: "https://shiprocket.co/tracking/MOCKAWB-SHIP-1",
        }),
        createDocuments: jest.fn().mockResolvedValue({
          manifest: "https://mock.test/manifest.pdf",
          label: "https://mock.test/label.pdf",
          invoice: "https://mock.test/invoice.pdf",
        }),
        cancel: jest.fn().mockResolvedValue(undefined),
        calculate: jest.fn().mockResolvedValue(99),
        schedulePickup: mockSchedulePickup,
        dispose: jest.fn(),
      })),
    }
  }
)

import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  createRegionsWorkflow,
  createStockLocationsWorkflow,
  createShippingProfilesWorkflow,
  createShippingOptionsWorkflow,
  createSalesChannelsWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  createProductsWorkflow,
  createInventoryLevelsWorkflow,
  createOrderWorkflow,
} from "@medusajs/medusa/core-flows"
import {
  createShipmentWorkflow,
  SHIPROCKET_PROVIDER_ID,
} from "../../src/workflows/create-shipment"
import { createWarehouseStaffWorkflow } from "../../src/workflows/create-warehouse-staff"
import { WMS_MODULE } from "../../src/modules/wms"
import type WmsModuleService from "../../src/modules/wms/service"

jest.setTimeout(120 * 1000)

// See wms-shipment-create.spec.ts: medusaIntegrationTestRunner's `env` option
// applies too late for medusa-config.ts's Shiprocket provider gate — set at
// module scope so it's visible before the config is first loaded.
process.env.SHIPROCKET_EMAIL = "dummy@test.dev"
process.env.SHIPROCKET_PASSWORD = "dummy"

// A minimal valid 1x1 red-pixel PNG, base64-encoded — tiny, real, and
// decodes without error via Buffer.from(..., "base64").
const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="

medusaIntegrationTestRunner({
  inApp: true,
  env: {
    SHIPROCKET_EMAIL: "dummy@test.dev",
    SHIPROCKET_PASSWORD: "dummy",
  },
  testSuite: ({ api, getContainer }) => {
    describe("wms pack/ship backend (H7)", () => {
      const email = "packer@warehouse.test"
      const password = "supersecret1"

      let authHeaders: { headers: { authorization: string } }
      let wms: WmsModuleService
      let inventoryModule: any
      let query: any

      const REQUIRED_SERIALIZED_QTY = 1
      const STOCKED_QUANTITY = 10

      let variant: any
      let inventoryItemId: string
      let stockLocationId: string

      let orderId: string
      let shipmentId: string
      let awb: string

      beforeEach(async () => {
        mockSchedulePickup.mockClear()
        mockSchedulePickup.mockResolvedValue(true)

        const container = getContainer()
        wms = container.resolve(WMS_MODULE)
        query = container.resolve(ContainerRegistrationKeys.QUERY)
        inventoryModule = container.resolve(Modules.INVENTORY)
        const link = container.resolve(ContainerRegistrationKeys.LINK)
        const fulfillmentModuleService: any = container.resolve(Modules.FULFILLMENT)

        const { result: staff } = await createWarehouseStaffWorkflow(
          container
        ).run({ input: { name: "Packer", email, password } })
        void staff
        const login = await api.post("/auth/warehouse_staff/emailpass", {
          email,
          password,
        })
        authHeaders = {
          headers: { authorization: `Bearer ${login.data.token}` },
        }

        const { result: regions } = await createRegionsWorkflow(container).run({
          input: {
            regions: [{ name: "India", currency_code: "inr", countries: ["in"] }],
          },
        })
        const regionId = regions[0].id

        const { result: locations } = await createStockLocationsWorkflow(
          container
        ).run({
          input: {
            locations: [
              {
                name: "Test Warehouse",
                address: {
                  address_1: "Plot 1, Industrial Area",
                  city: "Mumbai",
                  country_code: "IN",
                  postal_code: "400001",
                  province: "Maharashtra",
                },
              },
            ],
          },
        })
        stockLocationId = locations[0].id

        await link.create({
          [Modules.STOCK_LOCATION]: { stock_location_id: stockLocationId },
          [Modules.FULFILLMENT]: { fulfillment_provider_id: SHIPROCKET_PROVIDER_ID },
        })

        const fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
          name: "Test Delivery",
          type: "shipping",
          service_zones: [
            { name: "India", geo_zones: [{ country_code: "in", type: "country" }] },
          ],
        })
        await link.create({
          [Modules.STOCK_LOCATION]: { stock_location_id: stockLocationId },
          [Modules.FULFILLMENT]: { fulfillment_set_id: fulfillmentSet.id },
        })

        const { result: shippingProfiles } = await createShippingProfilesWorkflow(
          container
        ).run({ input: { data: [{ name: "Default Shipping Profile", type: "default" }] } })
        const shippingProfileId = shippingProfiles[0].id

        const { result: shippingOptions } = await createShippingOptionsWorkflow(
          container
        ).run({
          input: [
            {
              name: "Standard Shipping",
              price_type: "flat",
              provider_id: SHIPROCKET_PROVIDER_ID,
              service_zone_id: fulfillmentSet.service_zones[0].id,
              shipping_profile_id: shippingProfileId,
              type: {
                label: "Standard",
                description: "Standard shipping via Shiprocket",
                code: "standard",
              },
              prices: [
                { currency_code: "inr", amount: 99 },
                { region_id: regionId, amount: 99 },
              ],
              rules: [
                { attribute: "enabled_in_store", value: "true", operator: "eq" },
                { attribute: "is_return", value: "false", operator: "eq" },
              ],
            },
          ],
        })
        const shippingOptionId = shippingOptions[0].id

        const { result: salesChannels } = await createSalesChannelsWorkflow(
          container
        ).run({ input: { salesChannelsData: [{ name: "Test Webstore" }] } })
        const salesChannelId = salesChannels[0].id
        await linkSalesChannelsToStockLocationWorkflow(container).run({
          input: { id: stockLocationId, add: [salesChannelId] },
        })

        const { result: products } = await createProductsWorkflow(container).run({
          input: {
            products: [
              {
                title: "Test Contactor",
                status: ProductStatus.PUBLISHED,
                shipping_profile_id: shippingProfileId,
                options: [{ title: "Kind", values: ["Serialized"] }],
                variants: [
                  {
                    title: "Serialized",
                    sku: "SHIP-SER-1",
                    options: { Kind: "Serialized" },
                    manage_inventory: true,
                    metadata: { serialized: true },
                    prices: [{ amount: 1000, currency_code: "inr" }],
                  },
                ],
                sales_channels: [{ id: salesChannelId }],
              },
            ],
          },
        })
        variant = (products[0] as any).variants[0]

        const { data: inventoryItems } = await query.graph({
          entity: "inventory_item",
          fields: ["id", "sku"],
          filters: { sku: variant.sku },
        })
        inventoryItemId = inventoryItems[0].id
        await createInventoryLevelsWorkflow(container).run({
          input: {
            inventory_levels: [
              {
                inventory_item_id: inventoryItemId,
                location_id: stockLocationId,
                stocked_quantity: STOCKED_QUANTITY,
              },
            ],
          },
        })

        const shippingAddress = {
          first_name: "Ada",
          last_name: "Lovelace",
          address_1: "1 Test Street",
          city: "Mumbai",
          country_code: "in",
          postal_code: "400001",
          province: "Maharashtra",
          phone: "9999999999",
        }

        const orderInput: any = {
          region_id: regionId,
          sales_channel_id: salesChannelId,
          email: "customer@test.dev",
          currency_code: "inr",
          status: "pending",
          items: [
            {
              variant_id: variant.id,
              quantity: REQUIRED_SERIALIZED_QTY,
              unit_price: 1000,
              is_tax_inclusive: false,
              title: "Test Contactor - Serialized",
            },
          ],
          shipping_address: shippingAddress,
          billing_address: shippingAddress,
          shipping_methods: [
            {
              name: "Standard Shipping",
              amount: 99,
              shipping_option_id: shippingOptionId,
              data: {},
            },
          ],
        }

        const { result: order } = await createOrderWorkflow(container).run({
          input: orderInput,
        })

        const { data: orders } = await query.graph({
          entity: "order",
          fields: ["id", "items.*"],
          filters: { id: order.id },
        })
        orderId = orders[0].id

        const item = (orders[0] as any).items[0]
        await inventoryModule.createReservationItems({
          line_item_id: item.id,
          inventory_item_id: inventoryItemId,
          location_id: stockLocationId,
          quantity: item.quantity,
        })

        const { result: shipmentResult } = await createShipmentWorkflow(
          container
        ).run({ input: { order_id: orderId } })
        shipmentId = shipmentResult.shipment!.id
        awb = shipmentResult.shipment!.awb

        await wms.createSerialUnits({
          variant_id: variant.id,
          serial: "SHIP-SN-A",
          status: "in_stock",
        })
      })

      const stockedQuantity = async () => {
        const [level] = await inventoryModule.listInventoryLevels({
          inventory_item_id: inventoryItemId,
          location_id: stockLocationId,
        })
        return level ? level.stocked_quantity : 0
      }

      const pickScan = () =>
        api.post(
          `/wms/shipments/${shipmentId}/pick-scan`,
          { raw: "SHIP-SN-A" },
          authHeaders
        )
      const verifyAwb = (raw: string) =>
        api.post(
          `/wms/shipments/${shipmentId}/verify-awb`,
          { raw },
          authHeaders
        )
      const uploadPhoto = () =>
        api.post(
          `/wms/shipments/${shipmentId}/pack-photo`,
          { image_base64: TINY_PNG_BASE64, mime_type: "image/png" },
          authHeaders
        )
      const ship = () =>
        api.post(`/wms/shipments/${shipmentId}/ship`, {}, authHeaders)

      const pickThenVerify = async () => {
        await pickScan()
        await verifyAwb(awb)
      }

      const getFulfillments = async () => {
        const { data: orders } = await query.graph({
          entity: "order",
          fields: [
            "id",
            "fulfillments.id",
            "fulfillments.canceled_at",
            "fulfillments.shipped_at",
            "fulfillments.labels.tracking_number",
            "fulfillments.labels.label_url",
          ],
          filters: { id: orderId },
        })
        return (orders[0] as any).fulfillments ?? []
      }

      it("rejects an AWB mismatch and accepts the correct AWB", async () => {
        await pickScan()

        const mismatch = await verifyAwb("NOT-THE-AWB")
        expect(mismatch.status).toBe(200)
        expect(mismatch.data).toEqual({ verdict: "reject", code: "AWB_MISMATCH" })

        const shipmentAfterMismatch = await wms.retrieveShipment(shipmentId)
        expect(
          ((shipmentAfterMismatch as any).pick_state ?? {}).awb_verified_at
        ).toBeUndefined()

        const match = await verifyAwb(awb)
        expect(match.status).toBe(200)
        expect(match.data).toEqual({ verdict: "accept" })

        const shipmentAfterMatch = await wms.retrieveShipment(shipmentId)
        expect(
          ((shipmentAfterMatch as any).pick_state ?? {}).awb_verified_at
        ).toEqual(expect.any(String))
      })

      it("409s verify-awb before picking is complete", async () => {
        const res = await verifyAwb(awb).catch((e: any) => e.response)
        expect(res.status).toBe(409)
      })

      it("409s the pack photo before AWB verification, then accepts and replaces on re-upload", async () => {
        await pickScan()

        const beforeVerify = await uploadPhoto().catch((e: any) => e.response)
        expect(beforeVerify.status).toBe(409)

        await verifyAwb(awb)

        const first = await uploadPhoto()
        expect(first.status).toBe(200)
        const firstPackRecordId = first.data.pack_record.id
        const firstFileId = first.data.pack_record.photo_file_id

        const records1 = await wms.listPackRecords({ shipment_id: shipmentId })
        expect(records1).toHaveLength(1)

        const second = await uploadPhoto()
        expect(second.status).toBe(200)
        expect(second.data.pack_record.id).not.toBe(firstPackRecordId)
        expect(second.data.pack_record.photo_file_id).not.toBe(firstFileId)

        const records2 = await wms.listPackRecords({ shipment_id: shipmentId })
        expect(records2).toHaveLength(1)
        expect(records2[0].id).toBe(second.data.pack_record.id)
      })

      it("400s a disallowed mime type and 413s an oversized photo", async () => {
        await pickThenVerify()

        const badMime = await api
          .post(
            `/wms/shipments/${shipmentId}/pack-photo`,
            { image_base64: TINY_PNG_BASE64, mime_type: "image/gif" },
            authHeaders
          )
          .catch((e: any) => e.response)
        expect(badMime.status).toBe(400)

        // 6MB of decoded bytes, base64-encoded — over the 5MB cap.
        const oversizedBase64 = Buffer.alloc(6 * 1024 * 1024, 1).toString(
          "base64"
        )
        const tooBig = await api
          .post(
            `/wms/shipments/${shipmentId}/pack-photo`,
            { image_base64: oversizedBase64, mime_type: "image/jpeg" },
            authHeaders
          )
          .catch((e: any) => e.response)
        expect(tooBig.status).toBe(413)
      })

      it("409s shipping before fully picked, and 409s shipping without a pack photo", async () => {
        const notPicked = await ship().catch((e: any) => e.response)
        expect(notPicked.status).toBe(409)

        await pickThenVerify()
        const noPhoto = await ship().catch((e: any) => e.response)
        expect(noPhoto.status).toBe(409)
      })

      it("happy path: ships the order, marks serials shipped, schedules pickup, and touches zero inventory", async () => {
        const stockedBefore = await stockedQuantity()

        await pickThenVerify()
        await uploadPhoto()

        const res = await ship()
        expect(res.status).toBe(200)
        expect(res.data.shipment.status).toBe("fulfilled")
        expect(res.data.shipment.pick_state.pickup_pending).toBeFalsy()

        expect(mockSchedulePickup).toHaveBeenCalledTimes(1)
        expect(mockSchedulePickup).toHaveBeenCalledWith(awb, undefined)

        const fulfillments = await getFulfillments()
        expect(fulfillments).toHaveLength(1)
        expect(fulfillments[0].shipped_at).toBeTruthy()
        expect(fulfillments[0].labels ?? []).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ tracking_number: awb }),
          ])
        )

        const [serial] = await wms.listSerialUnits({
          variant_id: variant.id,
          serial: "SHIP-SN-A",
        })
        expect(serial.status).toBe("shipped")
        expect(serial.order_id).toBe(orderId)

        // Inventory was already decremented at H3 (createShipmentWorkflow) —
        // pack/ship must not touch it again.
        expect(await stockedQuantity()).toBe(stockedBefore)
        expect(await stockedQuantity()).toBe(STOCKED_QUANTITY - REQUIRED_SERIALIZED_QTY)
      })

      it("pickup failure never blocks shipping: shipment still ends fulfilled with pickup_pending flagged", async () => {
        mockSchedulePickup.mockResolvedValueOnce(false)

        await pickThenVerify()
        await uploadPhoto()

        const res = await ship()
        expect(res.status).toBe(200)
        expect(res.data.shipment.status).toBe("fulfilled")
        expect(res.data.shipment.pick_state.pickup_pending).toBe(true)

        expect(mockSchedulePickup).toHaveBeenCalledTimes(1)

        const shipment = await wms.retrieveShipment(shipmentId)
        expect((shipment as any).status).toBe("fulfilled")
        expect((shipment as any).pick_state.pickup_pending).toBe(true)

        // The order was still shipped even though pickup scheduling failed.
        const fulfillments = await getFulfillments()
        expect(fulfillments[0].shipped_at).toBeTruthy()
      })
    })
  },
})
