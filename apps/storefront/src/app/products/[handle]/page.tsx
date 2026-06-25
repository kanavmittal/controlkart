import type { Metadata } from "next"
import { notFound } from "next/navigation"
import {
  getProductByHandle,
  getProductSpecs,
  getProductDocuments,
  listProducts,
} from "@/lib/data/products"
import { SpecTable } from "@/components/products/spec-table"
import { DownloadsList } from "@/components/products/downloads-list"
import { PurchasePanel } from "@/components/products/purchase-panel"
import { ProductGallery } from "@/components/products/product-gallery"
import { ProductSelectionProvider } from "@/components/providers/product-selection-provider"
import { ProductCard } from "@/components/products/product-card"
import { BASE_URL, STORE_NAME } from "@/lib/config"
import { HttpTypes } from "@medusajs/types"

type Props = { params: Promise<{ handle: string }> }

/**
 * Canonical (variant-agnostic) product image URLs for SEO: product thumbnail
 * first, then all product images rank-sorted, deduped by URL and capped. Used
 * for JSON-LD `image` and OpenGraph `images`.
 */
function productImageUrls(product: HttpTypes.StoreProduct): string[] {
  const ranked = [...(product.images ?? [])]
    .sort(
      (a, b) =>
        (a.rank ?? 0) - (b.rank ?? 0) || a.id.localeCompare(b.id)
    )
    .map((i) => i.url)
  return [...(product.thumbnail ? [product.thumbnail] : []), ...ranked]
    .filter((url, idx, arr) => arr.indexOf(url) === idx)
    .slice(0, 6)
}

// ISR: pre-rendered per product, revalidated for fresh price/stock.
export const revalidate = 600

export async function generateStaticParams() {
  // Resilient: if the backend is unreachable at build time (e.g. CI/Docker),
  // skip prebuilding params — pages render on-demand at runtime instead.
  try {
    const { products } = await listProducts({ limit: 100 })
    return products.map((p) => ({ handle: p.handle }))
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params
  const product = await getProductByHandle(handle)
  if (!product) return { title: "Product Not Found" }

  const mpn = (product.metadata?.mpn as string) || ""
  return {
    title: `${product.title}${mpn ? ` (${mpn})` : ""} - Buy Online in India`,
    description:
      product.subtitle ||
      product.description?.slice(0, 155) ||
      `Buy ${product.title} with GST invoice and pan-India shipping.`,
    alternates: { canonical: `/products/${handle}` },
    openGraph: {
      title: product.title,
      images: productImageUrls(product).map((url) => ({ url, alt: product.title })),
    },
    twitter: {
      card: "summary_large_image",
      title: product.title,
      images: productImageUrls(product),
    },
  }
}

export default async function ProductPage({ params }: Props) {
  const { handle } = await params
  const product = await getProductByHandle(handle)
  if (!product) notFound()

  const [specs, documents, related] = await Promise.all([
    getProductSpecs(product.id),
    getProductDocuments(product.id),
    product.categories?.[0]
      ? listProducts({ category_id: product.categories[0].id, limit: 5 })
      : Promise.resolve({ products: [], count: 0 }),
  ])
  const relatedProducts = related.products
    .filter((p) => p.id !== product.id)
    .slice(0, 4)

  const variants = product.variants ?? []
  const prices = variants
    .map((v) => v.calculated_price?.calculated_amount)
    .filter((p): p is number => typeof p === "number")
  const inStock = variants.some((v) => (v.inventory_quantity ?? 0) > 0)
  const imageUrls = productImageUrls(product)

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description,
    image: imageUrls.length ? imageUrls : undefined,
    sku: variants[0]?.sku,
    mpn: (product.metadata?.mpn as string) || undefined,
    brand: {
      "@type": "Brand",
      name: (product.metadata?.brand as string) || "Selec",
    },
    // JSON-LD price/availability is intentionally the server (ISR-fresh) value so
    // crawlers get it in the initial HTML. The UI price/stock is live (CSR) via
    // PurchasePanel — do NOT switch this to client data or SSG/SEO breaks.
    offers: prices.length
      ? {
          "@type": "AggregateOffer",
          priceCurrency: "INR",
          lowPrice: Math.min(...prices),
          highPrice: Math.max(...prices),
          offerCount: variants.length,
          availability: inStock
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
          url: `${BASE_URL}/products/${handle}`,
          seller: { "@type": "Organization", name: STORE_NAME },
        }
      : undefined,
  }

  return (
    <div className="shell py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <nav className="text-xs text-[var(--color-ink-muted)]">
        Home / {product.categories?.[0]?.name ?? "Products"} /{" "}
        <span className="text-[var(--color-ink)]">{product.title}</span>
      </nav>

      <ProductSelectionProvider initialVariantId={variants[0]?.id}>
      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_minmax(360px,420px)]">
        <div>
          <header>
            <div className="font-mono text-sm text-[var(--color-ink-muted)]">
              {(product.metadata?.brand as string) ?? "Selec"} ·{" "}
              {(product.metadata?.mpn as string) ?? variants[0]?.sku}
            </div>
            <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight">
              {product.title}
            </h1>
            {product.subtitle && (
              <p className="mt-2 text-base text-[var(--color-ink-muted)]">
                {product.subtitle}
              </p>
            )}
          </header>

          <div className="mt-8">
            <ProductGallery product={product} />
          </div>

          {product.description && (
            <section className="mt-10">
              <h2 className="text-lg font-semibold">Overview</h2>
              <p className="mt-3 max-w-3xl whitespace-pre-line text-sm leading-relaxed text-[var(--color-ink-muted)]">
                {product.description}
              </p>
            </section>
          )}

          {specs.length > 0 && (
            <section className="mt-10">
              <h2 className="text-lg font-semibold">
                Technical Specifications
              </h2>
              <div className="mt-4">
                <SpecTable specs={specs} />
              </div>
            </section>
          )}

          {documents.length > 0 && (
            <section className="mt-10">
              <h2 className="text-lg font-semibold">Downloads</h2>
              <div className="mt-4">
                <DownloadsList documents={documents} />
              </div>
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-32 lg:self-start">
          <PurchasePanel product={product} />
        </aside>
      </div>
      </ProductSelectionProvider>

      {relatedProducts.length > 0 && (
        <section className="mt-20 border-t border-[var(--color-line)] pt-10">
          <h2 className="text-xl font-bold tracking-tight">
            Related Products & Accessories
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-px border border-[var(--color-line)] bg-[var(--color-line)] sm:grid-cols-2 lg:grid-cols-4">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
