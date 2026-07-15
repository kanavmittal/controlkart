import { moduleIntegrationTestRunner } from "@medusajs/test-utils"
import { WMS_MODULE } from ".."
import WmsModuleService from "../service"

jest.setTimeout(120000)

moduleIntegrationTestRunner<WmsModuleService>({
  moduleName: WMS_MODULE,
  resolve: "./src/modules/wms",
  testSuite: ({ service }) => {
    describe("wms module — serial ledger uniqueness", () => {
      it("creates a serial unit with defaults", async () => {
        const unit = await service.createSerialUnits({
          variant_id: "variant_alpha",
          serial: "SN-0001",
        })

        expect(unit.id).toMatch(/^wser/)
        expect(unit.status).toBe("in_stock")
        expect(unit.purchase_order_id).toBeNull()
        expect(unit.order_id).toBeNull()
      })

      it("rejects a duplicate (variant_id, serial) pair", async () => {
        await service.createSerialUnits({
          variant_id: "variant_alpha",
          serial: "SN-0001",
        })

        await expect(
          service.createSerialUnits({
            variant_id: "variant_alpha",
            serial: "SN-0001",
          })
        ).rejects.toThrow()
      })

      it("allows the same serial under a different variant", async () => {
        await service.createSerialUnits({
          variant_id: "variant_alpha",
          serial: "SN-0001",
        })

        const other = await service.createSerialUnits({
          variant_id: "variant_beta",
          serial: "SN-0001",
        })

        expect(other.variant_id).toBe("variant_beta")
        expect(other.serial).toBe("SN-0001")
      })
    })
  },
})
