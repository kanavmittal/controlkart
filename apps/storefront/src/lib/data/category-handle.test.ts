import { describe, it, expect } from "vitest"
import { matchCategoryHandle, normalizeHandle } from "./category-handle"

type Cat = { id: string; name: string; handle: string | null }

const cat = (id: string, handle: string | null, name = id): Cat => ({
  id,
  name,
  handle,
})

// Mirrors real backend data: some handles are lowercase-hyphen, some are the
// admin's raw underscore/uppercase output (the shape that broke routing).
const CATEGORIES: Cat[] = [
  cat("plcs", "plcs", "PLCs"),
  cat("vfds", "vfds", "VFDs"),
  cat("single", "single_phase_Input", "Single Phase Input"), // uppercase + underscores
  cat("three", "three_phase_input", "Three Phase Input"), // underscores
  cat("panel", "panel-mounted-plcs", "Panel-mounted PLCs"),
  cat("acc", "Accessories-2024", "Accessories"), // leading uppercase
]

describe("normalizeHandle", () => {
  it("lowercases and trims", () => {
    expect(normalizeHandle(" Single_Phase_Input ")).toBe("single_phase_input")
  })
  it("is null/undefined safe", () => {
    expect(normalizeHandle(null)).toBe("")
    expect(normalizeHandle(undefined)).toBe("")
    expect(normalizeHandle("")).toBe("")
  })
})

describe("matchCategoryHandle", () => {
  it("exact lowercase-hyphen handle resolves", () => {
    expect(matchCategoryHandle(CATEGORIES, "panel-mounted-plcs")?.id).toBe("panel")
  })

  it("exact underscore handle resolves", () => {
    expect(matchCategoryHandle(CATEGORIES, "three_phase_input")?.id).toBe("three")
  })

  // The bug: backend stores `single_phase_Input`, the lookup is case-sensitive,
  // so a lowercased URL previously 404'd. It must now resolve.
  it("resolves an uppercase-containing handle from a LOWERCASE url", () => {
    expect(matchCategoryHandle(CATEGORIES, "single_phase_input")?.id).toBe("single")
  })

  it("resolves it from an ALL-UPPERCASE url too", () => {
    expect(matchCategoryHandle(CATEGORIES, "SINGLE_PHASE_INPUT")?.id).toBe("single")
  })

  it("resolves it from the exact stored casing (fast path)", () => {
    expect(matchCategoryHandle(CATEGORIES, "single_phase_Input")?.id).toBe("single")
  })

  it("resolves a lowercase-stored handle from an uppercase url", () => {
    expect(matchCategoryHandle(CATEGORIES, "PLCS")?.id).toBe("plcs")
  })

  it("resolves mixed casing either direction", () => {
    expect(matchCategoryHandle(CATEGORIES, "Accessories-2024")?.id).toBe("acc")
    expect(matchCategoryHandle(CATEGORIES, "accessories-2024")?.id).toBe("acc")
    expect(matchCategoryHandle(CATEGORIES, "ACCESSORIES-2024")?.id).toBe("acc")
  })

  it("trims surrounding whitespace before matching", () => {
    expect(matchCategoryHandle(CATEGORIES, "  three_phase_input  ")?.id).toBe("three")
  })

  it("returns the stored (canonical) handle so callers can re-query exactly", () => {
    expect(matchCategoryHandle(CATEGORIES, "single_phase_input")?.handle).toBe(
      "single_phase_Input"
    )
  })

  it("prefers an EXACT match over a case-insensitive one", () => {
    const dupes: Cat[] = [
      cat("lower", "reset_pw", "lower"),
      cat("upper", "Reset_PW", "upper"),
    ]
    expect(matchCategoryHandle(dupes, "Reset_PW")?.id).toBe("upper")
    expect(matchCategoryHandle(dupes, "reset_pw")?.id).toBe("lower")
  })

  it("returns null for an unknown handle", () => {
    expect(matchCategoryHandle(CATEGORIES, "does-not-exist")).toBeNull()
  })

  it("returns null for empty / null / undefined targets", () => {
    expect(matchCategoryHandle(CATEGORIES, "")).toBeNull()
    expect(matchCategoryHandle(CATEGORIES, "   ")).toBeNull()
    expect(matchCategoryHandle(CATEGORIES, null)).toBeNull()
    expect(matchCategoryHandle(CATEGORIES, undefined)).toBeNull()
  })

  it("skips categories with null/empty handles without throwing", () => {
    const withNulls: Cat[] = [cat("a", null), cat("b", ""), cat("c", "hmis")]
    expect(matchCategoryHandle(withNulls, "HMIS")?.id).toBe("c")
    expect(matchCategoryHandle(withNulls, "")).toBeNull()
  })

  // Regression guard: the OLD behavior (naive case-sensitive find) would miss
  // the case-variant. This documents exactly what we fixed.
  it("fixes the case-sensitive regression (old naive find would miss it)", () => {
    const url = "single_phase_input" // as it would arrive lowercased
    const oldNaive = CATEGORIES.find((c) => c.handle === url) ?? null
    expect(oldNaive).toBeNull() // old behavior: 404
    expect(matchCategoryHandle(CATEGORIES, url)?.id).toBe("single") // fixed
  })
})
