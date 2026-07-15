import { findGaps, AuditedVariant } from "../audit-variant-shipping-data"

function makeVariant(overrides: Partial<AuditedVariant> = {}): AuditedVariant {
  return {
    id: "variant_1",
    sku: "SKU-1",
    title: "Default",
    weight: 500,
    length: 10,
    width: 10,
    height: 10,
    product: {
      id: "product_1",
      title: "Test Product",
      status: "published",
    },
    ...overrides,
  }
}

describe("findGaps", () => {
  it("returns no gaps for a fully-populated variant", () => {
    const variant = makeVariant()
    expect(findGaps([variant])).toEqual([])
  })

  it("returns an empty array for an empty variant list", () => {
    expect(findGaps([])).toEqual([])
  })

  it.each([
    ["weight", { weight: null }],
    ["length", { length: null }],
    ["width", { width: null }],
    ["height", { height: null }],
  ])("flags a variant missing %s (null)", (field, overrides) => {
    const variant = makeVariant(overrides)
    const gaps = findGaps([variant])

    expect(gaps).toHaveLength(1)
    expect(gaps[0].missingFields).toEqual([field])
  })

  it.each([
    ["weight", { weight: 0 }],
    ["length", { length: 0 }],
    ["width", { width: 0 }],
    ["height", { height: 0 }],
  ])("treats zero as missing for %s", (field, overrides) => {
    const variant = makeVariant(overrides)
    const gaps = findGaps([variant])

    expect(gaps).toHaveLength(1)
    expect(gaps[0].missingFields).toEqual([field])
  })

  it("flags multiple missing fields on the same variant, in field order", () => {
    const variant = makeVariant({ weight: null, height: 0 })
    const gaps = findGaps([variant])

    expect(gaps).toHaveLength(1)
    expect(gaps[0].missingFields).toEqual(["weight", "height"])
  })

  it("only returns entries for variants that actually have gaps", () => {
    const complete = makeVariant({ id: "variant_ok", sku: "SKU-OK" })
    const gappy = makeVariant({
      id: "variant_gap",
      sku: "SKU-GAP",
      weight: null,
    })

    const gaps = findGaps([complete, gappy])

    expect(gaps).toHaveLength(1)
    expect(gaps[0].id).toBe("variant_gap")
  })

  it("falls back to placeholder labels when sku/title are missing", () => {
    const variant = makeVariant({ sku: null, title: null, weight: null })
    const gaps = findGaps([variant])

    expect(gaps[0].sku).toBe("(no sku)")
    expect(gaps[0].variantTitle).toBe("(untitled variant)")
  })

  it("includes product title in the gap entry for reporting", () => {
    const variant = makeVariant({
      weight: null,
      product: { id: "product_2", title: "Widget", status: "published" },
    })
    const gaps = findGaps([variant])

    expect(gaps[0].productTitle).toBe("Widget")
  })

  it("a caller-filtered clean variant list (already scoped to published products) returns no gaps", () => {
    // findGaps itself is status-agnostic — the query.graph() filter is what
    // scopes this to published products before variants ever reach here.
    // This case documents that a clean, already-filtered list yields [].
    const publishedVariants = [
      makeVariant({ id: "v1", sku: "A" }),
      makeVariant({ id: "v2", sku: "B" }),
    ]

    expect(findGaps(publishedVariants)).toEqual([])
  })
})
