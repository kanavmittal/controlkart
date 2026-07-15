import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"
import { createWarehouseStaffWorkflow } from "../../src/workflows/create-warehouse-staff"
import { createPurchaseOrderWorkflow } from "../../src/workflows/create-purchase-order"
import { WMS_MODULE } from "../../src/modules/wms"
import type WmsModuleService from "../../src/modules/wms/service"

jest.setTimeout(120 * 1000)

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    describe("wms inbound scan validation (read-only)", () => {
      const email = "priya@warehouse.test"
      const password = "supersecret1"

      let authHeaders: { headers: { authorization: string } }
      let wms: WmsModuleService
      let variantSerialized: any
      let variantPlainB: any
      let poDelimited: any
      let poSkuOnly: any
      let preExistingSerial: string

      beforeEach(async () => {
        const container = getContainer()
        wms = container.resolve(WMS_MODULE)

        await createWarehouseStaffWorkflow(container).run({
          input: { name: "Priya", email, password },
        })
        const login = await api.post("/auth/warehouse_staff/emailpass", {
          email,
          password,
        })
        authHeaders = {
          headers: { authorization: `Bearer ${login.data.token}` },
        }

        // Supplier A: full "{sku}|{serial}" labels — used for the
        // serialized-line scenarios.
        const supplierDelimited = await wms.createSuppliers({
          name: "Delimited Supplier",
          barcode_template: "{sku}|{serial}",
          delimiter: "|",
        })
        // Supplier B: sku-only labels (no serial anywhere on the box) —
        // used for the non-serialized-line scenario.
        const supplierSkuOnly = await wms.createSuppliers({
          name: "Sku-Only Supplier",
          barcode_template: "{sku}",
          delimiter: null,
        })

        const productModule = container.resolve(Modules.PRODUCT)
        const product = await productModule.createProducts({
          title: "Allen-Bradley Relay",
          status: "published",
          options: [
            { title: "Variant", values: ["Serialized", "PlainA", "PlainB"] },
          ],
          variants: [
            {
              title: "Serialized unit",
              sku: "REL-SER-1",
              options: { Variant: "Serialized" },
              metadata: { serialized: true },
            },
            {
              title: "Plain unit A",
              sku: "REL-PLAIN-A",
              options: { Variant: "PlainA" },
            },
            {
              title: "Plain unit B",
              sku: "REL-PLAIN-B",
              options: { Variant: "PlainB" },
            },
          ],
        })
        const variants = await productModule.listProductVariants({
          product_id: product.id,
        })
        variantSerialized = variants.find((v: any) => v.sku === "REL-SER-1")
        const variantPlainA = variants.find(
          (v: any) => v.sku === "REL-PLAIN-A"
        )!
        variantPlainB = variants.find((v: any) => v.sku === "REL-PLAIN-B")

        const { result: poDelimitedResult } = await createPurchaseOrderWorkflow(
          container
        ).run({
          input: {
            supplier_id: supplierDelimited.id,
            lines: [
              { variant_id: variantSerialized.id, quantity_ordered: 5 },
              { variant_id: variantPlainA.id, quantity_ordered: 3 },
            ],
          },
        })
        poDelimited = poDelimitedResult
        await wms.updatePurchaseOrders({ id: poDelimited.id, status: "open" })

        const { result: poSkuOnlyResult } = await createPurchaseOrderWorkflow(
          container
        ).run({
          input: {
            supplier_id: supplierSkuOnly.id,
            lines: [{ variant_id: variantPlainB.id, quantity_ordered: 2 }],
          },
        })
        poSkuOnly = poSkuOnlyResult
        await wms.updatePurchaseOrders({ id: poSkuOnly.id, status: "open" })

        // Pre-existing serial for the SERIAL_EXISTS case.
        preExistingSerial = "SN-EXIST-1"
        await wms.createSerialUnits({
          variant_id: variantSerialized.id,
          serial: preExistingSerial,
        })
      })

      const scan = (poId: string, raw: string) =>
        api.post(`/wms/purchase-orders/${poId}/scan`, { raw }, authHeaders)

      it("accepts a valid serialized scan", async () => {
        const res = await scan(poDelimited.id, "REL-SER-1|SN-NEW-1")
        expect(res.status).toBe(200)
        expect(res.data).toEqual({
          verdict: "accept",
          variant_id: variantSerialized.id,
          sku: "REL-SER-1",
          serial: "SN-NEW-1",
        })
      })

      it("rejects a decoded sku that isn't on this PO", async () => {
        const res = await scan(poDelimited.id, "REL-UNKNOWN|SN-1")
        expect(res.status).toBe(200)
        expect(res.data).toEqual({ verdict: "reject", code: "NOT_ON_PO" })
      })

      it("rejects a serial that already exists for the variant", async () => {
        const res = await scan(
          poDelimited.id,
          `REL-SER-1|${preExistingSerial}`
        )
        expect(res.status).toBe(200)
        expect(res.data).toEqual({ verdict: "reject", code: "SERIAL_EXISTS" })
      })

      it("rejects a scan that doesn't fit the supplier's template", async () => {
        // Template requires two "|"-delimited segments; this has one.
        const res = await scan(poDelimited.id, "REL-SER-1")
        expect(res.status).toBe(200)
        expect(res.data).toEqual({ verdict: "reject", code: "SCAN_MISMATCH" })
      })

      it("accepts a sku-only scan for a non-serialized line", async () => {
        const res = await scan(poSkuOnly.id, "REL-PLAIN-B")
        expect(res.status).toBe(200)
        expect(res.data).toEqual({
          verdict: "accept",
          variant_id: variantPlainB.id,
          sku: "REL-PLAIN-B",
        })
      })

      it("performs zero writes: serial_unit count is unchanged after all scans", async () => {
        const before = await wms.listSerialUnits({})
        expect(before).toHaveLength(1)

        await scan(poDelimited.id, "REL-SER-1|SN-NEW-1")
        await scan(poDelimited.id, "REL-UNKNOWN|SN-1")
        await scan(poDelimited.id, `REL-SER-1|${preExistingSerial}`)
        await scan(poDelimited.id, "REL-SER-1")
        await scan(poSkuOnly.id, "REL-PLAIN-B")

        const after = await wms.listSerialUnits({})
        expect(after).toHaveLength(1)
      })
    })
  },
})
