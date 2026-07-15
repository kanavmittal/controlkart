/**
 * H3 — order-time outbound leg.
 *
 * The Shiprocket plugin's HTTP client is mocked at its public subpath
 * (`@sam-ael/medusa-plugin-shiprocket/providers/shiprocket/client`) so
 * `createOrderFulfillmentWorkflow` exercises the real plugin provider
 * (`shiprocket_shiprocket`) end-to-end — real core steps, real inventory
 * adjustments, real wms workflow — with ZERO live HTTP to Shiprocket.
 *
 * The provider's own `./client` relative import resolves to the exact same
 * file the public subpath maps to (see the package's `exports` map), so
 * mocking the public subpath intercepts it.
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
          awb: "MOCKAWB123",
          courier_company_id: 51,
          courier_name: "Mock Speed Courier",
          tracking_number: "MOCKAWB123",
          tracking_url: "https://shiprocket.co/tracking/MOCKAWB123",
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
  cancelShipmentWorkflow,
  SHIPROCKET_PROVIDER_ID,
} from "../../src/workflows/create-shipment"
import { WMS_MODULE } from "../../src/modules/wms"
import type WmsModuleService from "../../src/modules/wms/service"

jest.setTimeout(120 * 1000)

// medusaIntegrationTestRunner's `env` option applies too late: its beforeAll
// reads medusa-config.ts (via configLoaderOverride -> getConfigFile, which
// resolves and caches the config through configManager) *before* it applies
// `env` to process.env. medusa-config.ts's `modules` array gates the
// Shiprocket fulfillment provider on `process.env.SHIPROCKET_EMAIL` at
// module-array-construction time, so by the time `env` is applied the
// Shiprocket provider block has already been evaluated (and skipped). Set
// the vars directly at module scope here — this runs during Jest's
// collection phase, strictly before any `beforeAll` executes — so the
// config sees them. (`env` below is kept too, for parity with the plugin's
// runtime credential option resolution and to document the requirement.)
process.env.SHIPROCKET_EMAIL = "dummy@test.dev"
process.env.SHIPROCKET_PASSWORD = "dummy"

medusaIntegrationTestRunner({
  inApp: true,
  env: {
    SHIPROCKET_EMAIL: "dummy@test.dev",
    SHIPROCKET_PASSWORD: "dummy",
  },
  testSuite: ({ getContainer }) => {
    describe("wms create-shipment / cancel-shipment (Shiprocket, mocked)", () => {
      let wms: WmsModuleService
      let inventoryModule: any
      let query: any

      let regionId: string
      let stockLocationId: string
      let shippingOptionId: string
      let salesChannelId: string
      let variantId: string
      let inventoryItemId: string

      const STOCKED_QUANTITY = 10

      beforeEach(async () => {
        const container = getContainer()
        wms = container.resolve(WMS_MODULE)
        inventoryModule = container.resolve(Modules.INVENTORY)
        query = container.resolve(ContainerRegistrationKeys.QUERY)
        const link = container.resolve(ContainerRegistrationKeys.LINK)
        const fulfillmentModuleService: any = container.resolve(Modules.FULFILLMENT)

        // Region (India / INR)
        const { result: regions } = await createRegionsWorkflow(container).run({
          input: {
            regions: [
              {
                name: "India",
                currency_code: "inr",
                countries: ["in"],
              },
            ],
          },
        })
        regionId = regions[0].id

        // Stock location with a real address
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

        // Link the stock location to the shiprocket provider (required before
        // a shipping option on that provider can target this location's
        // service zone).
        await link.create({
          [Modules.STOCK_LOCATION]: { stock_location_id: stockLocationId },
          [Modules.FULFILLMENT]: { fulfillment_provider_id: SHIPROCKET_PROVIDER_ID },
        })

        // Fulfillment set + service zone (pan-India), linked to the location
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

        // Shipping profile
        const { result: shippingProfiles } = await createShippingProfilesWorkflow(
          container
        ).run({
          input: { data: [{ name: "Default Shipping Profile", type: "default" }] },
        })
        const shippingProfileId = shippingProfiles[0].id

        // Shipping option on the shiprocket_shiprocket provider
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
        shippingOptionId = shippingOptions[0].id

        // Sales channel, linked to the stock location
        const { result: salesChannels } = await createSalesChannelsWorkflow(
          container
        ).run({ input: { salesChannelsData: [{ name: "Test Webstore" }] } })
        salesChannelId = salesChannels[0].id
        await linkSalesChannelsToStockLocationWorkflow(container).run({
          input: { id: stockLocationId, add: [salesChannelId] },
        })

        // Product with a manage_inventory variant
        const { result: products } = await createProductsWorkflow(container).run({
          input: {
            products: [
              {
                title: "Test Contactor",
                status: ProductStatus.PUBLISHED,
                shipping_profile_id: shippingProfileId,
                options: [{ title: "Size", values: ["Standard"] }],
                variants: [
                  {
                    title: "Standard",
                    sku: "TEST-CONTACTOR-1",
                    options: { Size: "Standard" },
                    manage_inventory: true,
                    prices: [{ amount: 1000, currency_code: "inr" }],
                  },
                ],
                sales_channels: [{ id: salesChannelId }],
              },
            ],
          },
        })
        variantId = (products[0] as any).variants[0].id

        const { data: inventoryItems } = await query.graph({
          entity: "inventory_item",
          fields: ["id", "sku"],
          filters: { sku: "TEST-CONTACTOR-1" },
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
      })

      const stockedQuantity = async () => {
        const [level] = await inventoryModule.listInventoryLevels({
          inventory_item_id: inventoryItemId,
          location_id: stockLocationId,
        })
        return level ? level.stocked_quantity : 0
      }

      /**
       * Creates an order (via core createOrderWorkflow, bypassing the cart
       * flow) and, when a shipping method is included, a reservation for its
       * line item — mirroring what the cart-add-to-cart flow would have
       * created before checkout completed.
       */
      const placeOrder = async (
        container: any,
        quantity: number,
        options: { withShiprocketShipping: boolean }
      ) => {
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
              variant_id: variantId,
              quantity,
              unit_price: 1000,
              is_tax_inclusive: false,
              title: "Test Contactor - Standard",
            },
          ],
          shipping_address: shippingAddress,
          billing_address: shippingAddress,
        }

        if (options.withShiprocketShipping) {
          orderInput.shipping_methods = [
            {
              name: "Standard Shipping",
              amount: 99,
              shipping_option_id: shippingOptionId,
              data: {},
            },
          ]
        }

        const { result: order } = await createOrderWorkflow(container).run({
          input: orderInput,
        })

        const { data: orders } = await query.graph({
          entity: "order",
          fields: ["id", "items.id", "items.quantity"],
          filters: { id: order.id },
        })
        const fullOrder = orders[0]
        const item = fullOrder.items[0]

        if (options.withShiprocketShipping) {
          await inventoryModule.createReservationItems({
            line_item_id: item.id,
            inventory_item_id: inventoryItemId,
            location_id: stockLocationId,
            quantity,
          })
        }

        return { orderId: fullOrder.id as string }
      }

      const getFulfillments = async (orderId: string) => {
        const { data: orders } = await query.graph({
          entity: "order",
          fields: [
            "id",
            "fulfillments.id",
            "fulfillments.provider_id",
            "fulfillments.canceled_at",
          ],
          filters: { id: orderId },
        })
        return orders[0].fulfillments ?? []
      }

      it("creates a Medusa fulfillment + wms shipment (label_ready) + pending print_job, and decrements inventory; is idempotent on retry", async () => {
        const container = getContainer()
        const { orderId } = await placeOrder(container, 2, {
          withShiprocketShipping: true,
        })

        const { result } = await createShipmentWorkflow(container).run({
          input: { order_id: orderId },
        })

        expect(result.skipped).toBe(false)
        expect(result.shipment).toBeDefined()
        expect(result.shipment!.status).toBe("label_ready")
        expect(result.shipment!.awb).toBe("MOCKAWB123")
        expect(result.shipment!.shiprocket_order_id).toBe("9988776")
        expect(result.shipment!.label_url).toBe("https://mock.test/label.pdf")
        expect(result.shipment!.courier).toBe("Mock Speed Courier")

        expect(result.print_job).toBeDefined()
        expect(result.print_job!.status).toBe("pending")
        expect(result.print_job!.label_url).toBe("https://mock.test/label.pdf")
        expect(result.print_job!.shipment_id).toBe(result.shipment!.id)

        const fulfillments = await getFulfillments(orderId)
        expect(fulfillments).toHaveLength(1)
        expect(fulfillments[0].provider_id).toBe(SHIPROCKET_PROVIDER_ID)
        expect(fulfillments[0].canceled_at).toBeFalsy()

        expect(await stockedQuantity()).toBe(STOCKED_QUANTITY - 2)

        // Idempotent retry: the subscriber may fire more than once.
        const { result: secondResult } = await createShipmentWorkflow(
          container
        ).run({ input: { order_id: orderId } })

        expect(secondResult.skipped).toBe(false)
        expect(secondResult.shipment!.id).toBe(result.shipment!.id)

        const shipments = await wms.listShipments({ order_id: orderId })
        expect(shipments).toHaveLength(1)

        const fulfillmentsAfterRetry = await getFulfillments(orderId)
        expect(fulfillmentsAfterRetry).toHaveLength(1)

        expect(await stockedQuantity()).toBe(STOCKED_QUANTITY - 2)
      })

      it("cancels the fulfillment, restores stock, marks the shipment cancelled and the print_job failed", async () => {
        const container = getContainer()
        const { orderId } = await placeOrder(container, 3, {
          withShiprocketShipping: true,
        })

        await createShipmentWorkflow(container).run({
          input: { order_id: orderId },
        })

        expect(await stockedQuantity()).toBe(STOCKED_QUANTITY - 3)

        const { result } = await cancelShipmentWorkflow(container).run({
          input: { order_id: orderId },
        })

        expect(result.skipped).toBe(false)
        expect(result.shipment!.status).toBe("cancelled")

        const fulfillments = await getFulfillments(orderId)
        expect(fulfillments).toHaveLength(1)
        expect(fulfillments[0].canceled_at).toBeTruthy()

        expect(await stockedQuantity()).toBe(STOCKED_QUANTITY)

        const printJobs = await wms.listPrintJobs({ shipment_id: result.shipment!.id })
        expect(printJobs).toHaveLength(1)
        expect(printJobs[0].status).toBe("failed")
        expect(printJobs[0].error).toBe("order cancelled")

        // Idempotent retry: a second cancellation is a clean no-op.
        const { result: secondResult } = await cancelShipmentWorkflow(
          container
        ).run({ input: { order_id: orderId } })
        expect(secondResult.skipped).toBe(true)
      })

      it("skips cleanly for an order with no Shiprocket shipping method (no fulfillment, no wms shipment)", async () => {
        const container = getContainer()
        const { orderId } = await placeOrder(container, 1, {
          withShiprocketShipping: false,
        })

        const { result } = await createShipmentWorkflow(container).run({
          input: { order_id: orderId },
        })

        expect(result.skipped).toBe(true)
        expect(result.shipment).toBeUndefined()

        const shipments = await wms.listShipments({ order_id: orderId })
        expect(shipments).toHaveLength(0)

        const fulfillments = await getFulfillments(orderId)
        expect(fulfillments).toHaveLength(0)

        expect(await stockedQuantity()).toBe(STOCKED_QUANTITY)
      })
    })
  },
})
