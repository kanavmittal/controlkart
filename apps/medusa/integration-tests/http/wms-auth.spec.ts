import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { createWarehouseStaffWorkflow } from "../../src/workflows/create-warehouse-staff"
import { WMS_MODULE } from "../../src/modules/wms"
import type WmsModuleService from "../../src/modules/wms/service"

jest.setTimeout(120 * 1000)

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    describe("wms auth (warehouse_staff actor)", () => {
      const email = "asha@warehouse.test"
      const password = "supersecret1"
      let staffId: string

      beforeEach(async () => {
        const { result } = await createWarehouseStaffWorkflow(
          getContainer()
        ).run({
          input: { name: "Asha", email, password },
        })
        staffId = result.id
      })

      const login = async (): Promise<string> => {
        const res = await api.post("/auth/warehouse_staff/emailpass", {
          email,
          password,
        })
        return res.data.token
      }

      it("issues a token via core /auth/warehouse_staff/emailpass", async () => {
        const res = await api.post("/auth/warehouse_staff/emailpass", {
          email,
          password,
        })
        expect(res.status).toBe(200)
        expect(res.data.token).toBeTruthy()
      })

      it("returns the staff row on GET /wms/me with a bearer token", async () => {
        const token = await login()
        const res = await api.get("/wms/me", {
          headers: { authorization: `Bearer ${token}` },
        })
        expect(res.status).toBe(200)
        expect(res.data.staff).toMatchObject({
          id: staffId,
          name: "Asha",
          email,
          active: true,
        })
      })

      it("rejects /wms requests without a token", async () => {
        const res = await api.get("/wms/me").catch((e: any) => e.response)
        expect(res.status).toBe(401)
      })

      it("rejects tokens from another actor type (customer)", async () => {
        const reg = await api.post("/auth/customer/emailpass/register", {
          email: "buyer@customer.test",
          password: "buyerpass1",
        })
        expect(reg.data.token).toBeTruthy()

        const res = await api
          .get("/wms/me", {
            headers: { authorization: `Bearer ${reg.data.token}` },
          })
          .catch((e: any) => e.response)
        expect([401, 403]).toContain(res.status)
      })

      it("locks out disabled staff even with a still-valid token", async () => {
        const token = await login()
        const wms: WmsModuleService = getContainer().resolve(WMS_MODULE)
        await wms.updateStaff({ id: staffId, active: false })

        const res = await api
          .get("/wms/me", { headers: { authorization: `Bearer ${token}` } })
          .catch((e: any) => e.response)
        expect(res.status).toBe(403)
      })
    })
  },
})
