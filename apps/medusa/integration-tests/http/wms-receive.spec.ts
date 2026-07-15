import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createWarehouseStaffWorkflow } from "../../src/workflows/create-warehouse-staff"
import { createPurchaseOrderWorkflow } from "../../src/workflows/create-purchase-order"
import { WMS_MODULE } from "../../src/modules/wms"
import type WmsModuleService from "../../src/modules/wms/service"

jest.setTimeout(120 * 1000)

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    describe("wms receive purchase order (commit path)", () => {
      const email = "sam@warehouse.test"
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

      let po: any
      let lineSerialized: any
      let linePlain: any

      const QUANTITY_ORDERED_SERIALIZED = 3
      const QUANTITY_ORDERED_PLAIN = 5

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
          input: { name: "Sam", email, password },
        })
        staffId = staff.id
        const login = await api.post("/auth/warehouse_staff/emailpass", {
          email,
          password,
        })
        authHeaders = {
          headers: { authorization: `Bearer ${login.data.token}` },
        }

        const supplier = await wms.createSuppliers({
          name: "Receiving Test Supplier",
          barcode_template: "{sku}|{serial}",
          delimiter: "|",
        })

        const [location] = await stockLocationModule.createStockLocations([
          { name: "Test Warehouse" },
        ])
        locationId = location.id

        const product = await productModule.createProducts({
          title: "Schneider Contactor",
          status: "published",
          options: [{ title: "Variant", values: ["Serialized", "Plain"] }],
          variants: [
            {
              title: "Serialized unit",
              sku: "CTR-SER-1",
              options: { Variant: "Serialized" },
              metadata: { serialized: true },
            },
            {
              title: "Plain unit",
              sku: "CTR-PLAIN-1",
              options: { Variant: "Plain" },
            },
          ],
        })
        const variants = await productModule.listProductVariants({
          product_id: product.id,
        })
        variantSerialized = variants.find((v: any) => v.sku === "CTR-SER-1")
        variantPlain = variants.find((v: any) => v.sku === "CTR-PLAIN-1")

        // Bare module-level product creation doesn't create inventory items
        // or the product<->inventory link (that only happens inside the
        // full create-product workflow) — wire both up explicitly so the
        // receive workflow has an inventory item to resolve per variant.
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

        const { result: poResult } = await createPurchaseOrderWorkflow(
          container
        ).run({
          input: {
            supplier_id: supplier.id,
            lines: [
              {
                variant_id: variantSerialized.id,
                quantity_ordered: QUANTITY_ORDERED_SERIALIZED,
              },
              {
                variant_id: variantPlain.id,
                quantity_ordered: QUANTITY_ORDERED_PLAIN,
              },
            ],
          },
        })
        po = poResult
        await wms.updatePurchaseOrders({ id: po.id, status: "open" })

        const lines = await wms.listPurchaseOrderLines({
          purchase_order_id: po.id,
        })
        lineSerialized = lines.find(
          (l: any) => l.variant_id === variantSerialized.id
        )
        linePlain = lines.find((l: any) => l.variant_id === variantPlain.id)
      })

      const receive = (poId: string, body: any) =>
        api.post(`/wms/purchase-orders/${poId}/receive`, body, authHeaders)

      const stockedQuantity = async (inventoryItemId: string) => {
        const [level] = await inventoryModule.listInventoryLevels({
          inventory_item_id: inventoryItemId,
          location_id: locationId,
        })
        return level ? level.stocked_quantity : 0
      }

      it("fully receives a PO: serial_units, inventory, and status all land correctly", async () => {
        const res = await receive(po.id, {
          session_id: "sess-full-1",
          items: [
            {
              line_id: lineSerialized.id,
              serials: ["SN-A1", "SN-A2", "SN-A3"],
            },
            { line_id: linePlain.id, quantity: QUANTITY_ORDERED_PLAIN },
          ],
        })

        expect(res.status).toBe(200)
        expect(res.data.purchase_order.status).toBe("received")

        const serials = await wms.listSerialUnits({
          purchase_order_id: po.id,
        })
        expect(serials).toHaveLength(3)
        for (const serial of serials) {
          expect(serial.purchase_order_id).toBe(po.id)
          expect(serial.received_by).toBe(staffId)
          expect(serial.variant_id).toBe(variantSerialized.id)
        }

        expect(await stockedQuantity(inventoryItemSerialized.id)).toBe(3)
        expect(await stockedQuantity(inventoryItemPlain.id)).toBe(
          QUANTITY_ORDERED_PLAIN
        )
      })

      it("partially receives, then completes with a second session", async () => {
        const first = await receive(po.id, {
          session_id: "sess-partial-1",
          items: [
            { line_id: lineSerialized.id, serials: ["SN-B1", "SN-B2"] },
            { line_id: linePlain.id, quantity: 2 },
          ],
        })
        expect(first.status).toBe(200)
        expect(first.data.purchase_order.status).toBe("partially_received")
        expect(await stockedQuantity(inventoryItemSerialized.id)).toBe(2)
        expect(await stockedQuantity(inventoryItemPlain.id)).toBe(2)

        const second = await receive(po.id, {
          session_id: "sess-partial-2",
          items: [
            { line_id: lineSerialized.id, serials: ["SN-B3"] },
            { line_id: linePlain.id, quantity: 3 },
          ],
        })
        expect(second.status).toBe(200)
        expect(second.data.purchase_order.status).toBe("received")
        expect(await stockedQuantity(inventoryItemSerialized.id)).toBe(3)
        expect(await stockedQuantity(inventoryItemPlain.id)).toBe(5)

        const serials = await wms.listSerialUnits({
          purchase_order_id: po.id,
        })
        expect(serials).toHaveLength(3)
      })

      it("is idempotent on session_id: a retried POST does not double-receive", async () => {
        const body = {
          session_id: "sess-retry-1",
          items: [{ line_id: linePlain.id, quantity: 2 }],
        }

        const first = await receive(po.id, body)
        expect(first.status).toBe(200)
        expect(first.data.purchase_order.status).toBe("partially_received")

        const serialCountAfterFirst = (
          await wms.listSerialUnits({ purchase_order_id: po.id })
        ).length
        const stockAfterFirst = await stockedQuantity(inventoryItemPlain.id)
        const lineAfterFirst = await wms.retrievePurchaseOrderLine(
          linePlain.id
        )

        // Simulated flaky-Wi-Fi retry: identical session_id, identical body.
        const second = await receive(po.id, body)
        expect(second.status).toBe(200)
        expect(second.data.purchase_order.status).toBe("partially_received")

        const serialCountAfterSecond = (
          await wms.listSerialUnits({ purchase_order_id: po.id })
        ).length
        const stockAfterSecond = await stockedQuantity(inventoryItemPlain.id)
        const lineAfterSecond = await wms.retrievePurchaseOrderLine(
          linePlain.id
        )

        expect(serialCountAfterSecond).toBe(serialCountAfterFirst)
        expect(stockAfterSecond).toBe(stockAfterFirst)
        expect(lineAfterSecond.quantity_received).toBe(
          lineAfterFirst.quantity_received
        )
      })

      it("rejects a payload containing an already-received serial, leaving inventory and serial counts untouched", async () => {
        // A serial that already exists for this variant (e.g. from a prior
        // committed session, or a race with another scanner).
        const preExisting = "SN-DUP-1"
        await wms.createSerialUnits({
          variant_id: variantSerialized.id,
          serial: preExisting,
        })

        const serialsBefore = (
          await wms.listSerialUnits({ variant_id: variantSerialized.id })
        ).length
        const stockSerializedBefore = await stockedQuantity(
          inventoryItemSerialized.id
        )
        const stockPlainBefore = await stockedQuantity(inventoryItemPlain.id)

        const res = await receive(po.id, {
          session_id: "sess-conflict-1",
          items: [
            // otherwise-valid, new serial mixed with the colliding one
            { line_id: lineSerialized.id, serials: ["SN-NEW-1", preExisting] },
            // otherwise-valid, independent line in the same request
            { line_id: linePlain.id, quantity: 1 },
          ],
        }).catch((e: any) => e.response)

        expect(res.status).toBe(409)

        const serialsAfter = (
          await wms.listSerialUnits({ variant_id: variantSerialized.id })
        ).length
        expect(serialsAfter).toBe(serialsBefore)

        expect(await stockedQuantity(inventoryItemSerialized.id)).toBe(
          stockSerializedBefore
        )
        expect(await stockedQuantity(inventoryItemPlain.id)).toBe(
          stockPlainBefore
        )

        const po_ = await wms.retrievePurchaseOrder(po.id)
        expect(po_.status).toBe("open")
      })
    })
  },
})
