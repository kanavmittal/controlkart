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
    describe("Admin WMS purchase orders", () => {
      let headers: { headers: { authorization: string } }
      let supplierId: string
      let variantA: { id: string; sku: string; title: string }
      let variantB: { id: string; sku: string; title: string }

      /** Create an admin user + auth identity, then sign an admin JWT. */
      const createAdminHeaders = async () => {
        const container = getContainer()
        const email = "wms-admin@controlkart.test"

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
        const container = getContainer()

        headers = await createAdminHeaders()

        const wms = container.resolve("wms") as any
        const supplier = await wms.createSuppliers({
          name: "Acme Components",
          barcode_template: "{sku}|{serial}",
        })
        supplierId = supplier.id

        const productModule = container.resolve(Modules.PRODUCT)
        const product = await productModule.createProducts({
          title: "Siemens S7-1200 CPU",
          status: "published",
          options: [{ title: "Model", values: ["1212C", "1214C"] }],
          variants: [
            {
              title: "S7-1200 CPU 1212C",
              sku: "6ES7212-1AE40",
              options: { Model: "1212C" },
            },
            {
              title: "S7-1200 CPU 1214C",
              sku: "6ES7214-1AG40",
              options: { Model: "1214C" },
            },
          ],
        })
        const variants = await productModule.listProductVariants({
          product_id: product.id,
        })
        variantA = variants.find((v: any) => v.sku === "6ES7212-1AE40") as any
        variantB = variants.find((v: any) => v.sku === "6ES7214-1AG40") as any
      })

      const createDraftPo = async (
        lines: { variant_id: string; quantity_ordered: number }[]
      ) => {
        const response = await api.post(
          "/admin/wms/purchase-orders",
          { supplier_id: supplierId, lines },
          headers
        )
        expect(response.status).toBe(200)
        return response.data.purchase_order
      }

      it("creates draft POs with snapshotted lines and sequential display_ids", async () => {
        const po1 = await createDraftPo([
          { variant_id: variantA.id, quantity_ordered: 5 },
          { variant_id: variantB.id, quantity_ordered: 2 },
        ])
        const po2 = await createDraftPo([
          { variant_id: variantA.id, quantity_ordered: 1 },
        ])

        expect(po1.status).toBe("draft")
        expect(po1.supplier).toEqual(
          expect.objectContaining({ id: supplierId, name: "Acme Components" })
        )
        expect(po1.lines).toHaveLength(2)

        const lineA = po1.lines.find((l: any) => l.variant_id === variantA.id)
        expect(lineA).toEqual(
          expect.objectContaining({
            sku: "6ES7212-1AE40",
            title: "S7-1200 CPU 1212C",
            quantity_ordered: 5,
            quantity_received: 0,
          })
        )

        // sequential display_ids across two POs
        expect(typeof po1.display_id).toBe("number")
        expect(po2.display_id).toBe(po1.display_id + 1)

        // list is newest first, includes lines + supplier
        const list = await api.get("/admin/wms/purchase-orders", headers)
        expect(list.status).toBe(200)
        expect(list.data.purchase_orders[0].id).toBe(po2.id)
        expect(list.data.purchase_orders[1].id).toBe(po1.id)
      })

      it("400s on an illegal status transition (draft → received)", async () => {
        const po = await createDraftPo([
          { variant_id: variantA.id, quantity_ordered: 3 },
        ])

        const response = await api
          .post(
            `/admin/wms/purchase-orders/${po.id}`,
            { status: "received" },
            headers
          )
          .catch((e: any) => e.response)

        expect(response.status).toBe(400)

        // status is unchanged
        const detail = await api.get(
          `/admin/wms/purchase-orders/${po.id}`,
          headers
        )
        expect(detail.data.purchase_order.status).toBe("draft")
      })

      it("allows line edits while draft, 400s once the PO is open", async () => {
        const po = await createDraftPo([
          { variant_id: variantA.id, quantity_ordered: 3 },
        ])

        // add a line while draft → ok, sku/title snapshotted
        const added = await api.post(
          `/admin/wms/purchase-orders/${po.id}/lines`,
          { variant_id: variantB.id, quantity_ordered: 4 },
          headers
        )
        expect(added.status).toBe(200)
        expect(added.data.purchase_order.lines).toHaveLength(2)
        const addedLine = added.data.purchase_order.lines.find(
          (l: any) => l.variant_id === variantB.id
        )
        expect(addedLine).toEqual(
          expect.objectContaining({
            sku: "6ES7214-1AG40",
            title: "S7-1200 CPU 1214C",
            quantity_ordered: 4,
          })
        )

        // update a line while draft → ok
        const updated = await api.post(
          `/admin/wms/purchase-orders/${po.id}/lines/${addedLine.id}`,
          { quantity_ordered: 9 },
          headers
        )
        expect(updated.status).toBe(200)
        expect(
          updated.data.purchase_order.lines.find(
            (l: any) => l.id === addedLine.id
          ).quantity_ordered
        ).toBe(9)

        // open the PO
        const opened = await api.post(
          `/admin/wms/purchase-orders/${po.id}`,
          { status: "open" },
          headers
        )
        expect(opened.status).toBe(200)

        // add / update / remove lines on an open PO → 400
        const addAfterOpen = await api
          .post(
            `/admin/wms/purchase-orders/${po.id}/lines`,
            { variant_id: variantA.id, quantity_ordered: 1 },
            headers
          )
          .catch((e: any) => e.response)
        expect(addAfterOpen.status).toBe(400)

        const updateAfterOpen = await api
          .post(
            `/admin/wms/purchase-orders/${po.id}/lines/${addedLine.id}`,
            { quantity_ordered: 1 },
            headers
          )
          .catch((e: any) => e.response)
        expect(updateAfterOpen.status).toBe(400)

        const removeAfterOpen = await api
          .delete(
            `/admin/wms/purchase-orders/${po.id}/lines/${addedLine.id}`,
            headers
          )
          .catch((e: any) => e.response)
        expect(removeAfterOpen.status).toBe(400)
      })

      it("opens a draft PO (draft → open)", async () => {
        const po = await createDraftPo([
          { variant_id: variantA.id, quantity_ordered: 2 },
        ])

        const response = await api.post(
          `/admin/wms/purchase-orders/${po.id}`,
          { status: "open" },
          headers
        )
        expect(response.status).toBe(200)
        expect(response.data.purchase_order.status).toBe("open")

        const detail = await api.get(
          `/admin/wms/purchase-orders/${po.id}`,
          headers
        )
        expect(detail.data.purchase_order.status).toBe("open")
        expect(detail.data.purchase_order.lines).toHaveLength(1)
      })
    })
  },
})
