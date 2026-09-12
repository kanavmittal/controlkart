import { describe, expect, it } from "vitest"
import type { HttpTypes } from "@medusajs/types"
import { deriveMarketingBadges, deriveProductBadges } from "./product-badges"

const product = (metadata: Record<string, unknown> = {}) => ({
  metadata, created_at: new Date().toISOString(),
  variants: [{ manage_inventory: false, calculated_price: { original_amount: 100, calculated_amount: 80 } }],
} as unknown as HttpTypes.StoreProduct)

describe("backend-controlled badges", () => {
  it("does not invent a new-arrival badge from creation time", () => {
    expect(deriveProductBadges(product())).toEqual([{ label: "-20%", variant: "sale" }])
  })
  it("renders saved labels in order and respects automatic discount setting", () => {
    expect(deriveProductBadges(product({ storefront_badges: [{ label: "New Arrival", tone: "new" }, { label: "OEM Offer", tone: "custom" }], show_sale_badge: false })))
      .toEqual([{ label: "New Arrival", variant: "new" }, { label: "OEM Offer", variant: "custom" }])
  })
  it("hides removed labels", () => {
    expect(deriveProductBadges(product({ storefront_badges: [], show_sale_badge: false }))).toEqual([])
  })
  it("ignores malformed metadata and duplicate labels", () => {
    expect(deriveMarketingBadges({ storefront_badges: [null, 5, {}, { label: "x", tone: "invalid" }, { label: " ", tone: "new" }, { label: "x".repeat(41), tone: "new" }, { label: " Sale ", tone: "sale" }, { label: "sale", tone: "new" }] }))
      .toEqual([{ label: "Sale", variant: "sale" }])
    expect(deriveMarketingBadges({ storefront_badges: "New" })).toEqual([])
  })
  it("limits custom labels and does not duplicate an automatic price badge", () => {
    expect(deriveMarketingBadges({ storefront_badges: ["a", "b", "c", "d"].map((label) => ({ label, tone: "custom" })) })).toHaveLength(3)
    expect(deriveProductBadges(product({ storefront_badges: [{ label: "-20%", tone: "sale" }] }))).toHaveLength(1)
  })
  it("retains sold-out information when custom and price badges are hidden", () => {
    const soldOut = product({ show_sale_badge: false })
    soldOut.variants![0].manage_inventory = true
    soldOut.variants![0].inventory_quantity = 0
    expect(deriveProductBadges(soldOut)).toEqual([{ label: "Sold out", variant: "sold-out" }])
  })
})
