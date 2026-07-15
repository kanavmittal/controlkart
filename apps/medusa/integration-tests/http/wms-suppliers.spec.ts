import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"
import jwt from "jsonwebtoken"

jest.setTimeout(120 * 1000)

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    describe("admin wms suppliers", () => {
      let headers: { authorization: string }

      /**
       * Standard Medusa test pattern for admin auth: create a user + auth
       * identity through the container and sign a bearer token with the
       * project's JWT secret.
       */
      beforeEach(async () => {
        const container = getContainer()
        const userModule: any = container.resolve(Modules.USER)
        const authModule: any = container.resolve(Modules.AUTH)

        const user = await userModule.createUsers({
          email: "admin@controlkart.test",
          first_name: "Admin",
          last_name: "User",
        })
        const authIdentity = await authModule.createAuthIdentities({
          provider_identities: [
            { provider: "emailpass", entity_id: "admin@controlkart.test" },
          ],
          app_metadata: { user_id: user.id },
        })

        const config: any = container.resolve("configModule")
        const token = jwt.sign(
          {
            actor_id: user.id,
            actor_type: "user",
            auth_identity_id: authIdentity.id,
            app_metadata: { user_id: user.id },
          },
          config.projectConfig.http.jwtSecret,
          { expiresIn: "1d" }
        )
        headers = { authorization: `Bearer ${token}` }
      })

      const createSupplier = (overrides: Record<string, unknown> = {}) =>
        api.post(
          "/admin/wms/suppliers",
          {
            name: "Acme Components",
            barcode_template: "{sku}|{serial}",
            delimiter: "|",
            notes: "pipe-delimited labels",
            ...overrides,
          },
          { headers }
        )

      it("rejects unauthenticated requests", async () => {
        const res = await api
          .get("/admin/wms/suppliers")
          .catch((e: any) => e.response)
        expect(res.status).toBe(401)
      })

      it("creates a supplier and returns it from list + get", async () => {
        const created = await createSupplier()
        expect(created.status).toBe(201)
        expect(created.data.supplier).toMatchObject({
          name: "Acme Components",
          barcode_template: "{sku}|{serial}",
          delimiter: "|",
          notes: "pipe-delimited labels",
        })
        const id = created.data.supplier.id
        expect(id).toBeTruthy()

        const list = await api.get("/admin/wms/suppliers", { headers })
        expect(list.status).toBe(200)
        expect(list.data.count).toBe(1)
        expect(list.data.suppliers).toHaveLength(1)
        expect(list.data.suppliers[0].id).toBe(id)

        const single = await api.get(`/admin/wms/suppliers/${id}`, { headers })
        expect(single.status).toBe(200)
        expect(single.data.supplier.id).toBe(id)
      })

      it("rejects an invalid template (duplicate placeholder) with a typed error", async () => {
        const res = await createSupplier({
          barcode_template: "{sku}|{sku}",
        }).catch((e: any) => e.response)

        expect(res.status).toBe(400)
        expect(res.data.error.code).toBe("TEMPLATE_INVALID")
        expect(res.data.error.message).toEqual(expect.any(String))

        // Invalid templates must never be persisted.
        const list = await api.get("/admin/wms/suppliers", { headers })
        expect(list.data.count).toBe(0)
      })

      it("rejects an update that would make the template invalid", async () => {
        const created = await createSupplier()
        const id = created.data.supplier.id

        const res = await api
          .post(
            `/admin/wms/suppliers/${id}`,
            { barcode_template: "{serial}|{serial}" },
            { headers }
          )
          .catch((e: any) => e.response)

        expect(res.status).toBe(400)
        expect(res.data.error.code).toBe("TEMPLATE_INVALID")

        // Stored template unchanged.
        const single = await api.get(`/admin/wms/suppliers/${id}`, { headers })
        expect(single.data.supplier.barcode_template).toBe("{sku}|{serial}")
      })

      it("updates and deletes a supplier", async () => {
        const created = await createSupplier()
        const id = created.data.supplier.id

        const updated = await api.post(
          `/admin/wms/suppliers/${id}`,
          { name: "Acme Components (EU)", notes: null },
          { headers }
        )
        expect(updated.status).toBe(200)
        expect(updated.data.supplier).toMatchObject({
          id,
          name: "Acme Components (EU)",
          barcode_template: "{sku}|{serial}",
          notes: null,
        })

        const deleted = await api.delete(`/admin/wms/suppliers/${id}`, {
          headers,
        })
        expect(deleted.status).toBe(200)
        expect(deleted.data).toMatchObject({
          id,
          object: "supplier",
          deleted: true,
        })

        const gone = await api
          .get(`/admin/wms/suppliers/${id}`, { headers })
          .catch((e: any) => e.response)
        expect(gone.status).toBe(404)
      })

      it("preview-scan decodes a valid scan without persisting anything", async () => {
        const res = await api.post(
          "/admin/wms/suppliers/preview-scan",
          {
            template: "{sku}|{serial}",
            delimiter: "|",
            raw: "CK-KEYCAP-01|SN0042",
          },
          { headers }
        )

        expect(res.status).toBe(200)
        expect(res.data).toEqual({ sku: "CK-KEYCAP-01", serial: "SN0042" })

        const list = await api.get("/admin/wms/suppliers", { headers })
        expect(list.data.count).toBe(0)
      })

      it("preview-scan surfaces SCAN_MISMATCH for a scan that doesn't fit the template", async () => {
        const res = await api
          .post(
            "/admin/wms/suppliers/preview-scan",
            {
              template: "{sku}|{serial}",
              delimiter: "|",
              raw: "just-one-segment",
            },
            { headers }
          )
          .catch((e: any) => e.response)

        expect(res.status).toBe(400)
        expect(res.data.error.code).toBe("SCAN_MISMATCH")
        expect(res.data.error.message).toEqual(expect.any(String))
      })
    })
  },
})
