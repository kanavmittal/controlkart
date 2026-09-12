import { beforeEach, describe, expect, it, vi } from "vitest"
import { storeFetch } from "../medusa"
import { listProducts } from "./products"
import { listFeaturedProducts } from "./featured-products"
vi.mock("../medusa", () => ({ storeFetch: vi.fn() }))
vi.mock("./products", () => ({ listProducts: vi.fn() }))

describe("homepage featured collection", () => {
  beforeEach(() => vi.resetAllMocks())
  it("requests only the products selected in Medusa", async () => {
    vi.mocked(storeFetch).mockResolvedValue({ collections: [{ id: "pcol_featured" }] })
    vi.mocked(listProducts).mockResolvedValue({ products: [], count: 0 })
    await listFeaturedProducts()
    expect(storeFetch).toHaveBeenCalledWith("/store/collections", expect.objectContaining({ query: { handle: "homepage-featured", limit: 1 } }))
    expect(listProducts).toHaveBeenCalledWith({ collection_id: "pcol_featured", limit: 8 })
  })
  it("does not substitute arbitrary products when the collection is absent", async () => {
    vi.mocked(storeFetch).mockResolvedValue({ collections: [] })
    expect(await listFeaturedProducts()).toEqual([])
    expect(listProducts).not.toHaveBeenCalled()
  })
  it("surfaces an unavailable backend for the page fallback", async () => {
    vi.mocked(storeFetch).mockRejectedValue(new Error("offline"))
    await expect(listFeaturedProducts()).rejects.toThrow("offline")
  })
})
