import { badgeRoute } from "../badge-route"

function fixture(kind: "product" | "category", method: string, body?: unknown) {
  const entity = { id: "entity_1", metadata: { brand: "Selec", footnote: "Keep me" } }
  const service = {
    retrieveProduct: jest.fn().mockResolvedValue(entity),
    retrieveProductCategory: jest.fn().mockResolvedValue(entity),
    updateProducts: jest.fn().mockResolvedValue(entity),
    updateProductCategories: jest.fn().mockResolvedValue(entity),
  }
  const req = { method, body, params: { id: entity.id }, scope: { resolve: () => service } }
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
  return { service, req, res, run: () => badgeRoute(kind)(req as never, res as never) }
}

describe.each(["product", "category"] as const)("%s badges API", (kind) => {
  it("reads defaults from an existing entity", async () => {
    const f = fixture(kind, "GET")
    await f.run()
    expect(f.res.json).toHaveBeenCalledWith({ badges: [], show_sale_badge: true })
  })
  it("saves and clears badges without replacing other metadata", async () => {
    const f = fixture(kind, "POST", { badges: [{ label: " New Arrival ", tone: "new" }], show_sale_badge: false })
    await f.run()
    const update = kind === "product" ? f.service.updateProducts : f.service.updateProductCategories
    expect(update).toHaveBeenCalledWith("entity_1", { metadata: {
      brand: "Selec", footnote: "Keep me", storefront_badges: [{ label: "New Arrival", tone: "new" }], show_sale_badge: false,
    } })
    f.req.body = { badges: [], show_sale_badge: true }
    await f.run()
    expect(update).toHaveBeenLastCalledWith("entity_1", { metadata: { brand: "Selec", footnote: "Keep me", storefront_badges: [], show_sale_badge: true } })
  })
  it("rejects invalid writes before accessing the service", async () => {
    const f = fixture(kind, "POST", { badges: [{ label: "", tone: "new" }], show_sale_badge: true })
    await f.run()
    expect(f.res.status).toHaveBeenCalledWith(400)
    expect(f.service.retrieveProduct).not.toHaveBeenCalled()
    expect(f.service.retrieveProductCategory).not.toHaveBeenCalled()
    expect(f.service.updateProducts).not.toHaveBeenCalled()
    expect(f.service.updateProductCategories).not.toHaveBeenCalled()
  })
  it("does not report success if persistence fails", async () => {
    const f = fixture(kind, "POST", { badges: [], show_sale_badge: true })
    const update = kind === "product" ? f.service.updateProducts : f.service.updateProductCategories
    update.mockRejectedValueOnce(new Error("Database unavailable"))
    await expect(f.run()).rejects.toThrow("Database unavailable")
    expect(f.res.json).not.toHaveBeenCalled()
  })
})
