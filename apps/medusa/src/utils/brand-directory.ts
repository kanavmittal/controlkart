export type BrandProfile = {
  name: string
  logo_url: string | null
  cover_url: string | null
  description: string
  enabled: boolean
}
export type DirectoryBrand = BrandProfile & { product_count: number }

export const brandKey = (name: string) => name.trim().toLowerCase()

export function parseBrandProfile(value: unknown): BrandProfile {
  if (!value || typeof value !== "object") throw new Error("Invalid brand")
  const input = value as Record<string, unknown>
  if (typeof input.name !== "string" || !input.name.trim() || input.name.trim().length > 80) throw new Error("Brand name must contain 1–80 characters")
  if (typeof input.enabled !== "boolean") throw new Error("Choose brand visibility")
  if (typeof input.description !== "string" || input.description.length > 1000) throw new Error("Description must be at most 1,000 characters")
  const image = (value: unknown) => {
    if (value === null || value === "") return null
    if (typeof value !== "string" || value.length > 2048) throw new Error("Invalid image URL")
    const url = value.trim()
    if (/^\/static\/[a-zA-Z0-9_./%-]+$/.test(url) && !url.includes("..")) return url
    try { if (["http:", "https:"].includes(new URL(url).protocol)) return url } catch { /* validation below */ }
    throw new Error("Use an http(s) image URL or upload an image")
  }
  return { name: input.name.trim(), logo_url: image(input.logo_url), cover_url: image(input.cover_url), description: input.description.trim(), enabled: input.enabled }
}

export function readBrandProfiles(metadata?: Record<string, unknown> | null): BrandProfile[] {
  if (!Array.isArray(metadata?.brand_profiles)) return []
  return metadata.brand_profiles.flatMap((profile) => {
    try { return [parseBrandProfile(profile)] } catch { return [] }
  })
}

/** Public brands come from published products, never a hard-coded supplier list. */
export function buildBrandDirectory(products: { metadata?: Record<string, unknown> | null }[], profiles: BrandProfile[], admin = false): DirectoryBrand[] {
  const byName = new Map<string, DirectoryBrand>()
  for (const profile of profiles) byName.set(brandKey(profile.name), { ...profile, product_count: 0 })
  for (const product of products) {
    const name = product.metadata?.brand
    if (typeof name !== "string" || !name.trim()) continue
    const key = brandKey(name)
    const entry = byName.get(key) ?? { name: name.trim(), logo_url: null, cover_url: null, description: "", enabled: true, product_count: 0 }
    entry.product_count++
    byName.set(key, entry)
  }
  return [...byName.values()].filter((brand) => admin || (brand.enabled && brand.product_count > 0)).sort((a, b) => a.name.localeCompare(b.name))
}

export function upsertBrandProfile(metadata: Record<string, unknown> | null | undefined, profile: BrandProfile) {
  const profiles = readBrandProfiles(metadata).filter((item) => brandKey(item.name) !== brandKey(profile.name))
  return { ...metadata, brand_profiles: [...profiles, profile] }
}
