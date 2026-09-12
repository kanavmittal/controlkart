import { storeFetch } from "../medusa"
import { MEDUSA_BACKEND_URL } from "../config"

export type StoreBrand = {
  name: string
  logo_url: string | null
  cover_url: string | null
  description: string
  product_count: number
  href: string
}

/** Backend-owned assets may be local to Medusa's file server. */
function assetUrl(value: string | null): string | null {
  if (!value) return null
  return value.startsWith("/") ? new URL(value, process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || MEDUSA_BACKEND_URL).toString() : value
}

export async function listBrands(): Promise<StoreBrand[]> {
  const { brands } = await storeFetch<{ brands: Omit<StoreBrand, "href">[] }>("/store/brands", { revalidate: 60, tags: ["brands"] })
  return brands.map((brand) => ({
    ...brand,
    logo_url: assetUrl(brand.logo_url),
    cover_url: assetUrl(brand.cover_url),
    href: `/products?vendor=${encodeURIComponent(brand.name)}`,
  }))
}
