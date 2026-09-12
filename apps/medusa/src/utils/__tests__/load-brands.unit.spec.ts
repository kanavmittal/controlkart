import { loadBrands } from "../load-brands"
import { Modules } from "@medusajs/framework/utils"

describe("load brands", () => {
  it("reads beyond the first product page and only requests published products", async () => {
    const products = { listProducts: jest.fn().mockResolvedValueOnce(Array.from({ length: 500 }, () => ({ metadata: { brand: "Selec" } }))).mockResolvedValueOnce([{ metadata: { brand: "Another" } }]) }
    const stores = { listStores: jest.fn().mockResolvedValue([{ metadata: {} }]) }
    const scope = { resolve: (name: string) => name === Modules.PRODUCT ? products : stores }
    const brands = await loadBrands(scope as never)
    expect(brands.map((brand) => [brand.name, brand.product_count])).toEqual([["Another", 1], ["Selec", 500]])
    expect(products.listProducts).toHaveBeenNthCalledWith(2, { status: "published" }, expect.objectContaining({ skip: 500, take: 500 }))
  })
})
