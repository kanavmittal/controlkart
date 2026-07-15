import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createWarehouseStaffWorkflow } from "../../src/workflows/create-warehouse-staff"
import { WMS_MODULE } from "../../src/modules/wms"
import type WmsModuleService from "../../src/modules/wms/service"

jest.setTimeout(120 * 1000)

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    describe("wms stock-take (PO-less serial registration)", () => {
      const email = "stocktake@warehouse.test"
      const password = "supersecret1"

      let authHeaders: { headers: { authorization: string } }
      let staffId: string
      let wms: WmsModuleService
      let inventoryModule: any
      let locationId: string

      let variantSerialized: any
      let variantPlain: any
      let inventoryItemSerialized: any
      let inventoryItemPlain: any

      beforeEach(async () => {
        const container = getContainer()
        wms = container.resolve(WMS_MODULE)
        inventoryModule = container.resolve(Modules.INVENTORY)
        const stockLocationModule: any = container.resolve(Modules.STOCK_LOCATION)
        const link = container.resolve(ContainerRegistrationKeys.LINK)
        const productModule = container.resolve(Modules.PRODUCT)

        const { result: staff } = await createWarehouseStaffWorkflow(
          container
        ).run({
          input: { name: "Stock Taker", email, password },
        })
        staffId = staff.id
        const login = await api.post("/auth/warehouse_staff/emailpass", {
          email,
          password,
        })
        authHeaders = {
          headers: { authorization: `Bearer ${login.data.token}` },
        }

        const [location] = await stockLocationModule.createStockLocations([
          { name: "Test Warehouse" },
        ])
        locationId = location.id

        const product = await productModule.createProducts({
          title: "Schneider Breaker",
          status: "published",
          options: [{ title: "Variant", values: ["Serialized", "Plain"] }],
          variants: [
            {
              title: "Serialized unit",
              sku: "BRK-SER-1",
              options: { Variant: "Serialized" },
              metadata: { serialized: true },
            },
            {
              title: "Plain unit",
              sku: "BRK-PLAIN-1",
              options: { Variant: "Plain" },
            },
          ],
        })
        const variants = await productModule.listProductVariants({
          product_id: product.id,
        })
        variantSerialized = variants.find((v: any) => v.sku === "BRK-SER-1")
        variantPlain = variants.find((v: any) => v.sku === "BRK-PLAIN-1")

        inventoryItemSerialized = await inventoryModule.createInventoryItems({
          sku: variantSerialized.sku,
        })
        inventoryItemPlain = await inventoryModule.createInventoryItems({
          sku: variantPlain.sku,
        })
        await link.create([
          {
            [Modules.PRODUCT]: { variant_id: variantSerialized.id },
            [Modules.INVENTORY]: {
              inventory_item_id: inventoryItemSerialized.id,
            },
          },
          {
            [Modules.PRODUCT]: { variant_id: variantPlain.id },
            [Modules.INVENTORY]: { inventory_item_id: inventoryItemPlain.id },
          },
        ])

        // Existing shelf stock already has correct Medusa quantities —
        // stock-take must never touch these.
        await inventoryModule.createInventoryLevels([
          {
            inventory_item_id: inventoryItemSerialized.id,
            location_id: locationId,
            stocked_quantity: 4,
          },
          {
            inventory_item_id: inventoryItemPlain.id,
            location_id: locationId,
            stocked_quantity: 10,
          },
        ])
      })

      const stockTake = (body: any) =>
        api.post("/wms/stock-take", body, authHeaders)

      const stockedQuantity = async (inventoryItemId: string) => {
        const [level] = await inventoryModule.listInventoryLevels({
          inventory_item_id: inventoryItemId,
          location_id: locationId,
        })
        return level ? level.stocked_quantity : 0
      }

      it("commits and creates serial_units with no PO ref, staff attributed, and leaves every inventory level unchanged", async () => {
        const serializedBefore = await stockedQuantity(inventoryItemSerialized.id)
        const plainBefore = await stockedQuantity(inventoryItemPlain.id)

        const res = await stockTake({
          session_id: "st-sess-1",
          items: [
            { variant_id: variantSerialized.id, serials: ["ST-A1", "ST-A2"] },
          ],
        })

        expect(res.status).toBe(200)
        expect(res.data.committed).toBe(true)
        expect(res.data.already_committed).toBe(false)
        expect(res.data.serial_count).toBe(2)

        const serials = await wms.listSerialUnits({
          variant_id: variantSerialized.id,
        })
        expect(serials).toHaveLength(2)
        for (const serial of serials) {
          expect(serial.purchase_order_id).toBeNull()
          expect(serial.received_by).toBe(staffId)
        }

        // Explicit before/after assert: zero inventory changes, anywhere.
        expect(await stockedQuantity(inventoryItemSerialized.id)).toBe(
          serializedBefore
        )
        expect(await stockedQuantity(inventoryItemPlain.id)).toBe(plainBefore)
      })

      it("rejects a payload containing an already-registered serial, leaving serial count unchanged", async () => {
        await wms.createSerialUnits({
          variant_id: variantSerialized.id,
          serial: "ST-DUP-1",
        })

        const countBefore = (
          await wms.listSerialUnits({ variant_id: variantSerialized.id })
        ).length

        const res = await stockTake({
          session_id: "st-sess-2",
          items: [
            {
              variant_id: variantSerialized.id,
              serials: ["ST-NEW-1", "ST-DUP-1"],
            },
          ],
        }).catch((e: any) => e.response)

        expect(res.status).toBe(409)

        const countAfter = (
          await wms.listSerialUnits({ variant_id: variantSerialized.id })
        ).length
        expect(countAfter).toBe(countBefore)
      })

      it("is idempotent on session_id: a retried POST does not create new serials", async () => {
        const body = {
          session_id: "st-sess-3",
          items: [{ variant_id: variantSerialized.id, serials: ["ST-B1"] }],
        }

        const first = await stockTake(body)
        expect(first.status).toBe(200)
        expect(first.data.already_committed).toBe(false)
        expect(first.data.serial_count).toBe(1)

        const countAfterFirst = (
          await wms.listSerialUnits({ variant_id: variantSerialized.id })
        ).length

        const second = await stockTake(body)
        expect(second.status).toBe(200)
        expect(second.data.already_committed).toBe(true)
        expect(second.data.serial_count).toBe(1)

        const countAfterSecond = (
          await wms.listSerialUnits({ variant_id: variantSerialized.id })
        ).length
        expect(countAfterSecond).toBe(countAfterFirst)
      })

      it("rejects a non-serialized variant in the payload with 400", async () => {
        const res = await stockTake({
          session_id: "st-sess-4",
          items: [{ variant_id: variantPlain.id, serials: ["ST-PLAIN-1"] }],
        }).catch((e: any) => e.response)

        expect(res.status).toBe(400)

        const serials = await wms.listSerialUnits({
          variant_id: variantPlain.id,
        })
        expect(serials).toHaveLength(0)
      })
    })
  },
})
