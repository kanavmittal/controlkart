import { buildBrandDirectory, parseBrandProfile, readBrandProfiles, upsertBrandProfile } from "../brand-directory"
const profile = { name: "Selec", logo_url: "/static/brands/selec-logo.png", cover_url: null, description: "Controls", enabled: true }

describe("backend brand directory", () => {
  it("discovers and deduplicates real product brands", () => {
    expect(buildBrandDirectory([{ metadata: { brand: " Selec " } }, { metadata: { brand: "selec" } }, { metadata: { brand: "" } }, {}], [profile]))
      .toEqual([{ ...profile, product_count: 2 }])
  })
  it("does not advertise configured brands without products or disabled brands", () => {
    expect(buildBrandDirectory([{ metadata: { brand: "Selec" } }], [{ ...profile, enabled: false }, { ...profile, name: "Unused" }])).toEqual([])
    expect(buildBrandDirectory([], [profile], true)).toEqual([{ ...profile, product_count: 0 }])
  })
  it("includes newly published product brands without artwork placeholders", () => {
    expect(buildBrandDirectory([{ metadata: { brand: "New Manufacturer" } }], []))
      .toEqual([{ name: "New Manufacturer", logo_url: null, cover_url: null, description: "", enabled: true, product_count: 1 }])
  })
  it("updates artwork without losing unrelated settings or duplicating a brand", () => {
    const metadata = { unrelated: "keep", brand_profiles: [profile] }
    expect(upsertBrandProfile(metadata, { ...profile, logo_url: "https://example.com/logo.png" })).toEqual({ unrelated: "keep", brand_profiles: [{ ...profile, logo_url: "https://example.com/logo.png" }] })
    expect(metadata.brand_profiles[0].logo_url).toEqual(profile.logo_url)
  })
  it("validates names, image schemes, flags and description length", () => {
    for (const invalid of [null, {}, { ...profile, name: " " }, { ...profile, name: "x".repeat(81) }, { ...profile, enabled: "true" }, { ...profile, description: "x".repeat(1001) }, { ...profile, logo_url: "javascript:alert(1)" }, { ...profile, logo_url: "file:///secret" }, { ...profile, logo_url: "/static/../secret" }]) {
      expect(() => parseBrandProfile(invalid)).toThrow()
    }
    expect(parseBrandProfile({ ...profile, name: " Selec ", logo_url: "" })).toEqual({ ...profile, logo_url: null })
  })
  it("ignores malformed stored entries", () => {
    expect(readBrandProfiles({ brand_profiles: [null, {}, profile] })).toEqual([profile])
    expect(readBrandProfiles(null)).toEqual([])
  })
})
