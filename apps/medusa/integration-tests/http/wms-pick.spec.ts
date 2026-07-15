/**
 * H6 — server-persisted picking state.
 *
 * Seeding mirrors wms-shipment-create.spec.ts: the Shiprocket plugin's HTTP
 * client is mocked at its public subpath so createShipmentWorkflow exercises
 * the real plugin provider end-to-end (real core steps, real inventory
 * adjustments) with zero live HTTP to Shiprocket, giving us a real
 * `label_ready` shipment with an AWB to drive the by-awb / pick-scan /
 * pick-qty routes under test.
 */
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
          awb: "MOCKAWB-PICK-1",
          courier_company_id: 51,
          courier_name: "Mock Speed Courier",
          tracking_number: "MOCKAWB-PICK-1",
          tracking_url: "https://shiprocket.co/tracking/MOCKAWB-PICK-1",
        }),
        createDocuments: jest.fn().mockResolvedValue({
          manifest: "https://mock.test/manifest.pdf",
          label: "https://mock.test/label.pdf",
          invoice: "https://mock.test/invoice.pdf",
        }),
        cancel: jest.fn().mockResolvedValue(undefined),
        calculate: jest.fn().mockResolvedValue(99),
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

medusaIntegrationTestRunner({
  inApp: true,
  env: {
    SHIPROCKET_EMAIL: "dummy@test.dev",
    SHIPROCKET_PASSWORD: "dummy",
  },
  testSuite: ({ api, getContainer }) => {
    describe("wms pick backend (H6)", () => {
      const email = "picker@warehouse.test"
      const password = "supersecret1"

      let authHeaders: { headers: { authorization: string } }
      let wms: WmsModuleService

      const REQUIRED_SERIALIZED_QTY = 2
      const REQUIRED_PLAIN_QTY = 2
      const STOCKED_QUANTITY = 10

      let variantSerialized: any
      let variantPlain: any
      let foreignVariantId: string

      let orderId: string
      let shipmentId: string
      let awb: string

      beforeEach(async () => {
        const container = getContainer()
        wms = container.resolve(WMS_MODULE)
        const query: any = container.resolve(ContainerRegistrationKeys.QUERY)
        const inventoryModule: any = container.resolve(Modules.INVENTORY)
        const link = container.resolve(ContainerRegistrationKeys.LINK)
        const fulfillmentModuleService: any = container.resolve(Modules.FULFILLMENT)
        const productModule: any = container.resolve(Modules.PRODUCT)

        const { result: staff } = await createWarehouseStaffWorkflow(
          container
        ).run({ input: { name: "Picker", email, password } })
        void staff
        const login = await api.post("/auth/warehouse_staff/emailpass", {
          email,
          password,
        })
        authHeaders = {
          headers: { authorization: `Bearer ${login.data.token}` },
        }

        // Region (India / INR)
        const { result: regions } = await createRegionsWorkflow(container).run({
          input: {
            regions: [{ name: "India", currency_code: "inr", countries: ["in"] }],
          },
        })
        const regionId = regions[0].id

        // Stock location
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
        const stockLocationId = locations[0].id

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

        // Product with a serialized and a plain (non-serialized) variant.
        const { result: products } = await createProductsWorkflow(container).run({
          input: {
            products: [
              {
                title: "Test Contactor",
                status: ProductStatus.PUBLISHED,
                shipping_profile_id: shippingProfileId,
                options: [{ title: "Kind", values: ["Serialized", "Plain"] }],
                variants: [
                  {
                    title: "Serialized",
                    sku: "PICK-SER-1",
                    options: { Kind: "Serialized" },
                    manage_inventory: true,
                    metadata: { serialized: true },
                    prices: [{ amount: 1000, currency_code: "inr" }],
                  },
                  {
                    title: "Plain",
                    sku: "PICK-PLAIN-1",
                    options: { Kind: "Plain" },
                    manage_inventory: true,
                    prices: [{ amount: 500, currency_code: "inr" }],
                  },
                ],
                sales_channels: [{ id: salesChannelId }],
              },
            ],
          },
        })
        variantSerialized = (products[0] as any).variants.find(
          (v: any) => v.sku === "PICK-SER-1"
        )
        variantPlain = (products[0] as any).variants.find(
          (v: any) => v.sku === "PICK-PLAIN-1"
        )

        // A second product/variant NOT on the order — used to prove WRONG_ITEM.
        const foreignProduct = await productModule.createProducts({
          title: "Foreign Product",
          status: "published",
          options: [{ title: "Kind", values: ["Only"] }],
          variants: [
            { title: "Only", sku: "PICK-FOREIGN-1", options: { Kind: "Only" } },
          ],
        })
        const foreignVariants = await productModule.listProductVariants({
          product_id: foreignProduct.id,
        })
        foreignVariantId = foreignVariants[0].id

        for (const variant of [variantSerialized, variantPlain]) {
          const { data: inventoryItems } = await query.graph({
            entity: "inventory_item",
            fields: ["id", "sku"],
            filters: { sku: variant.sku },
          })
          const inventoryItemId = inventoryItems[0].id
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
        }

        // Place the order with a Shiprocket shipping method.
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
              variant_id: variantSerialized.id,
              quantity: REQUIRED_SERIALIZED_QTY,
              unit_price: 1000,
              is_tax_inclusive: false,
              title: "Test Contactor - Serialized",
            },
            {
              variant_id: variantPlain.id,
              quantity: REQUIRED_PLAIN_QTY,
              unit_price: 500,
              is_tax_inclusive: false,
              title: "Test Contactor - Plain",
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

        // WILDCARD `items.*` — listing dotted fields like `items.quantity`
        // explicitly silently drops `quantity` (documented quirk).
        const { data: orders } = await query.graph({
          entity: "order",
          fields: ["id", "items.*"],
          filters: { id: order.id },
        })
        orderId = orders[0].id

        for (const item of orders[0].items as any[]) {
          const variant = [variantSerialized, variantPlain].find(
            (v) => v.id === item.variant_id
          )
          const { data: inventoryItems } = await query.graph({
            entity: "inventory_item",
            fields: ["id", "sku"],
            filters: { sku: variant.sku },
          })
          await inventoryModule.createReservationItems({
            line_item_id: item.id,
            inventory_item_id: inventoryItems[0].id,
            location_id: stockLocationId,
            quantity: item.quantity,
          })
        }

        const { result: shipmentResult } = await createShipmentWorkflow(
          container
        ).run({ input: { order_id: orderId } })
        shipmentId = shipmentResult.shipment!.id
        awb = shipmentResult.shipment!.awb

        // Serial units available for picking.
        await wms.createSerialUnits({
          variant_id: variantSerialized.id,
          serial: "SN-A",
          status: "in_stock",
        })
        await wms.createSerialUnits({
          variant_id: variantSerialized.id,
          serial: "SN-B",
          status: "in_stock",
        })
        // Extra in_stock unit beyond the required quantity — for OVER_SCAN.
        await wms.createSerialUnits({
          variant_id: variantSerialized.id,
          serial: "SN-C",
          status: "in_stock",
        })
        // Already shipped — for the "found but not in_stock" SERIAL_NOT_IN_STOCK case.
        await wms.createSerialUnits({
          variant_id: variantSerialized.id,
          serial: "SN-SHIPPED",
          status: "shipped",
        })
        // Belongs to a variant not on this order — for WRONG_ITEM.
        await wms.createSerialUnits({
          variant_id: foreignVariantId,
          serial: "SN-FOREIGN",
          status: "in_stock",
        })
      })

      const byAwb = (theAwb: string) =>
        api.get(`/wms/shipments/by-awb/${theAwb}`, authHeaders)
      const pickScan = (raw: string) =>
        api.post(
          `/wms/shipments/${shipmentId}/pick-scan`,
          { raw },
          authHeaders
        )
      const pickQty = (variant_id: string, quantity: number) =>
        api.post(
          `/wms/shipments/${shipmentId}/pick-qty`,
          { variant_id, quantity },
          authHeaders
        )

      const findProgress = (items: any[], variantId: string) =>
        items.find((i: any) => i.variant_id === variantId)

      it("happy path: scanning every unit accurately tracks progress and flips the shipment to picked", async () => {
        const first = await pickScan("SN-A")
        expect(first.status).toBe(200)
        expect(first.data.verdict).toBe("accept")
        expect(
          findProgress(first.data.progress, variantSerialized.id).picked
        ).toBe(1)
        expect(first.data.all_picked).toBe(false)

        const second = await pickScan("SN-B")
        expect(second.status).toBe(200)
        expect(second.data.verdict).toBe("accept")
        expect(
          findProgress(second.data.progress, variantSerialized.id).picked
        ).toBe(2)
        expect(second.data.all_picked).toBe(false)

        const third = await pickQty(variantPlain.id, REQUIRED_PLAIN_QTY)
        expect(third.status).toBe(200)
        expect(third.data.verdict).toBe("accept")
        expect(
          findProgress(third.data.progress, variantPlain.id).picked
        ).toBe(REQUIRED_PLAIN_QTY)
        expect(third.data.all_picked).toBe(true)

        const shipment = await wms.retrieveShipment(shipmentId)
        expect((shipment as any).status).toBe("picked")
      })

      it("rejects a serial belonging to a variant not on this order with WRONG_ITEM, naming what's still needed", async () => {
        const res = await pickScan("SN-FOREIGN")
        expect(res.status).toBe(200)
        expect(res.data.verdict).toBe("reject")
        expect(res.data.code).toBe("WRONG_ITEM")

        const bySku = new Map(
          res.data.expected.map((e: any) => [e.sku, e])
        )
        expect(bySku.get("PICK-SER-1")).toMatchObject({
          title: "Test Contactor - Serialized",
          remaining: REQUIRED_SERIALIZED_QTY,
        })
        expect(bySku.get("PICK-PLAIN-1")).toMatchObject({
          title: "Test Contactor - Plain",
          remaining: REQUIRED_PLAIN_QTY,
        })
      })

      it("rejects an extra unit of an already-full line with OVER_SCAN", async () => {
        await pickScan("SN-A")
        await pickScan("SN-B")

        const res = await pickScan("SN-C")
        expect(res.status).toBe(200)
        expect(res.data).toEqual({ verdict: "reject", code: "OVER_SCAN" })
      })

      it("rejects unknown and already-shipped serials with SERIAL_NOT_IN_STOCK", async () => {
        const unknown = await pickScan("SN-DOES-NOT-EXIST")
        expect(unknown.status).toBe(200)
        expect(unknown.data).toEqual({
          verdict: "reject",
          code: "SERIAL_NOT_IN_STOCK",
        })

        const shipped = await pickScan("SN-SHIPPED")
        expect(shipped.status).toBe(200)
        expect(shipped.data).toEqual({
          verdict: "reject",
          code: "SERIAL_NOT_IN_STOCK",
        })
      })

      it("resumes: a fresh GET by-awb reflects progress persisted by earlier requests", async () => {
        await pickScan("SN-A")
        await pickQty(variantPlain.id, 1)

        const res = await byAwb(awb)
        expect(res.status).toBe(200)
        expect(res.data.shipment.id).toBe(shipmentId)

        const serializedProgress = findProgress(
          res.data.items,
          variantSerialized.id
        )
        expect(serializedProgress.picked).toBe(1)
        expect(serializedProgress.quantity).toBe(REQUIRED_SERIALIZED_QTY)
        expect(serializedProgress.serialized).toBe(true)

        const plainProgress = findProgress(res.data.items, variantPlain.id)
        expect(plainProgress.picked).toBe(1)
        expect(plainProgress.quantity).toBe(REQUIRED_PLAIN_QTY)
        expect(plainProgress.serialized).toBe(false)

        expect(res.data.all_picked).toBe(false)
      })

      it("404s on an unknown AWB", async () => {
        const res = await byAwb("NO-SUCH-AWB").catch((e: any) => e.response)
        expect(res.status).toBe(404)
      })
    })
  },
})
