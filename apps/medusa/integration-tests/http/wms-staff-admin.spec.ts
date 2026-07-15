import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import {
  ContainerRegistrationKeys,
  generateJwtToken,
  Modules,
} from "@medusajs/framework/utils"

jest.setTimeout(120 * 1000)

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    describe("Admin WMS staff", () => {
      let headers: { headers: { authorization: string } }

      /** Create an admin user + auth identity, then sign an admin JWT. */
      const createAdminHeaders = async () => {
        const container = getContainer()
        const email = "wms-staff-admin@controlkart.test"

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
        headers = await createAdminHeaders()
      })

      it("creates staff via the admin route, and that staff can then log in", async () => {
        const email = "priya@warehouse.test"
        const password = "supersecret1"

        const created = await api.post(
          "/admin/wms/staff",
          { name: "Priya", email, password },
          headers
        )
        expect(created.status).toBe(200)
        expect(created.data.staff).toMatchObject({
          name: "Priya",
          email,
          active: true,
        })

        const list = await api.get("/admin/wms/staff", headers)
        expect(list.status).toBe(200)
        expect(
          list.data.staff.some((s: any) => s.email === email)
        ).toBe(true)

        const login = await api.post("/auth/warehouse_staff/emailpass", {
          email,
          password,
        })
        expect(login.status).toBe(200)
        expect(login.data.token).toBeTruthy()
      })

      it("disabling staff via the admin route 403s their /wms/me with a previously valid token", async () => {
        const email = "ravi@warehouse.test"
        const password = "supersecret1"

        const created = await api.post(
          "/admin/wms/staff",
          { name: "Ravi", email, password },
          headers
        )
        const staffId = created.data.staff.id

        const login = await api.post("/auth/warehouse_staff/emailpass", {
          email,
          password,
        })
        const staffToken = login.data.token

        // token works before disabling
        const meBefore = await api.get("/wms/me", {
          headers: { authorization: `Bearer ${staffToken}` },
        })
        expect(meBefore.status).toBe(200)

        const disabled = await api.post(
          `/admin/wms/staff/${staffId}`,
          { active: false },
          headers
        )
        expect(disabled.status).toBe(200)
        expect(disabled.data.staff.active).toBe(false)

        const meAfter = await api
          .get("/wms/me", {
            headers: { authorization: `Bearer ${staffToken}` },
          })
          .catch((e: any) => e.response)
        expect(meAfter.status).toBe(403)
      })

      it("rejects a warehouse-staff token on the admin staff routes", async () => {
        const email = "meera@warehouse.test"
        const password = "supersecret1"

        await api.post(
          "/admin/wms/staff",
          { name: "Meera", email, password },
          headers
        )

        const login = await api.post("/auth/warehouse_staff/emailpass", {
          email,
          password,
        })
        const staffToken = login.data.token
        const staffHeaders = { headers: { authorization: `Bearer ${staffToken}` } }

        const list = await api
          .get("/admin/wms/staff", staffHeaders)
          .catch((e: any) => e.response)
        expect([401, 403]).toContain(list.status)

        const create = await api
          .post(
            "/admin/wms/staff",
            { name: "Nope", email: "nope@warehouse.test", password: "supersecret1" },
            staffHeaders
          )
          .catch((e: any) => e.response)
        expect([401, 403]).toContain(create.status)
      })
    })
  },
})
