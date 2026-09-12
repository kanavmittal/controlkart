import { beforeEach, describe, expect, it, vi } from "vitest"
import { storeFetch } from "../medusa"
import { listBrands } from "./brands"
vi.mock("../medusa", () => ({ storeFetch: vi.fn() }))
vi.mock("../config", () => ({ MEDUSA_BACKEND_URL: "http://localhost:9000" }))

describe("storefront brand data", () => {
  beforeEach(() => { vi.resetAllMocks(); vi.stubEnv("NEXT_PUBLIC_MEDUSA_BACKEND_URL", "https://commerce.example.com") })
  it("uses backend artwork and an encoded vendor filter", async () => {
    vi.mocked(storeFetch).mockResolvedValue({ brands: [{ name: "L&T", logo_url: "/static/logo.png", cover_url: "https://cdn.example.com/cover.jpg", description: "Controls", product_count: 4 }] })
    expect(await listBrands()).toEqual([{ name: "L&T", logo_url: "https://commerce.example.com/static/logo.png", cover_url: "https://cdn.example.com/cover.jpg", description: "Controls", product_count: 4, href: "/products?vendor=L%26T" }])
    expect(storeFetch).toHaveBeenCalledWith("/store/brands", { revalidate: 60, tags: ["brands"] })
  })
  it("does not insert placeholder brands or logos", async () => {
    vi.mocked(storeFetch).mockResolvedValue({ brands: [] })
    expect(await listBrands()).toEqual([])
    vi.mocked(storeFetch).mockResolvedValue({ brands: [{ name: "New Brand", logo_url: null, cover_url: null, description: "", product_count: 1 }] })
    expect((await listBrands())[0]).toMatchObject({ logo_url: null, cover_url: null })
  })
  it("surfaces backend errors so consumers can show their empty state", async () => {
    vi.mocked(storeFetch).mockRejectedValue(new Error("offline"))
    await expect(listBrands()).rejects.toThrow("offline")
  })
})
