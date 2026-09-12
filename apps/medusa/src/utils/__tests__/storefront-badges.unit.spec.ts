import { mergeBadgeSettings, parseBadgeSettings, readBadgeSettings } from "../storefront-badges"

describe("storefront badge settings", () => {
  it("trims labels and preserves their order", () => {
    expect(parseBadgeSettings({ badges: [{ label: " New Arrival ", tone: "new" }, { label: "20% Off", tone: "sale" }], show_sale_badge: false }))
      .toEqual({ badges: [{ label: "New Arrival", tone: "new" }, { label: "20% Off", tone: "sale" }], show_sale_badge: false })
  })
  it.each([null, {}, { badges: [], show_sale_badge: "true" },
    { badges: [{ label: " ", tone: "new" }], show_sale_badge: true },
    { badges: [{ label: "x".repeat(41), tone: "new" }], show_sale_badge: true },
    { badges: [{ label: "New", tone: "red" }], show_sale_badge: true },
    { badges: Array(4).fill({ label: "New", tone: "new" }), show_sale_badge: true },
    { badges: [{ label: "New", tone: "new" }, { label: "new", tone: "sale" }], show_sale_badge: true },
  ])("rejects invalid settings %j", (value) => { expect(() => parseBadgeSettings(value)).toThrow() })
  it("removes labels without losing unrelated product metadata", () => {
    const current = { brand: "Selec", hsn: "123", footnote: "Note", storefront_badges: [{ label: "New", tone: "new" }] }
    const result = mergeBadgeSettings(current, { badges: [], show_sale_badge: false })
    expect(result).toEqual({ ...current, storefront_badges: [], show_sale_badge: false })
    expect(current.storefront_badges).toHaveLength(1)
  })
  it("defaults to no promotional claims and enables real price discounts", () => {
    expect(readBadgeSettings(null)).toEqual({ badges: [], show_sale_badge: true })
  })
})
