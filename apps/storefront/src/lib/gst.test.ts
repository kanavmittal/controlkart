import { describe, expect, it } from "vitest"

import { isValidGstin, normalizeGstin } from "./gst"

describe("normalizeGstin", () => {
  it("trims and uppercases", () => {
    expect(normalizeGstin("  27aapfu0939f1zv  ")).toBe("27AAPFU0939F1ZV")
  })
})

describe("isValidGstin", () => {
  it("accepts real GSTINs with correct check digits", () => {
    expect(isValidGstin("27AAPFU0939F1ZV")).toBe(true)
    expect(isValidGstin("29AAGCB7383J1Z4")).toBe(true)
  })

  it("normalizes case and whitespace before validating", () => {
    expect(isValidGstin(" 27aapfu0939f1zv ")).toBe(true)
  })

  it("rejects a valid structure with a wrong check digit", () => {
    expect(isValidGstin("27AAPFU0939F1ZX")).toBe(false)
  })

  it("rejects wrong length", () => {
    expect(isValidGstin("27AAPFU0939F1Z")).toBe(false)
    expect(isValidGstin("27AAPFU0939F1ZVV")).toBe(false)
  })

  it("rejects structurally invalid strings", () => {
    expect(isValidGstin("1234567890ABCDE")).toBe(false)
    expect(isValidGstin("AA27PFU0939F1ZV")).toBe(false)
  })

  it("rejects an out-of-range state code", () => {
    // 00 is not an assigned GST state code.
    expect(isValidGstin("00AAPFU0939F1ZV")).toBe(false)
  })

  it("rejects the 11th char when it is not 'Z'", () => {
    expect(isValidGstin("27AAPFU0939F1AV")).toBe(false)
  })

  it("treats empty input as invalid (callers decide if GST is optional)", () => {
    expect(isValidGstin("")).toBe(false)
    expect(isValidGstin("   ")).toBe(false)
  })
})
