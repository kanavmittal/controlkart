import type { Metadata } from "next"
import { notFound } from "next/navigation"
import {
  getProductByHandle,
  getProductSpecs,
  getProductDocuments,
  listProducts,
} from "@/lib/data/products"
import { ProductAccordions } from "@/components/product/product-accordions"
import { ProductGallery } from "@/components/product/product-gallery"
import { ProductSummary } from "@/components/product/product-summary"
import { BuyBox } from "@/components/product/buy-box"
import { ProductSelectionProvider } from "@/components/providers/product-selection-provider"
import { ProductCard } from "@/components/product/product-card"
import { ProductGrid } from "@/components/product/product-grid"
import { QuickViewButton } from "@/components/product/quick-view-button"
import { Breadcrumbs } from "@/components/shared/breadcrumbs"
import { SectionHeading } from "@/components/shared/section-heading"
import { pdpContent } from "@/config/site"
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

  const category = product.categories?.[0]
  const crumbs = [
    ...(category ? [{ label: category.name, href: `/categories/${category.handle}` }] : []),
    { label: product.title },
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />

      <Breadcrumbs crumbs={crumbs} />

      <div className="athens-container py-[50px]">
        <ProductSelectionProvider initialVariantId={variants[0]?.id}>
          {/*
            `items-start` is required for `self-start` sticky to work below —
            without it the grid's default `stretch` alignment forces the
            right column to the left column's full height, so it never has
            room to "unstick" and finish scrolling before the left column
            does.
          */}
          <div className="grid gap-12 min-[990px]:grid-cols-2 min-[990px]:items-start">
            {/* Left: gallery + accordions — scrolls normally */}
            <div>
              <ProductGallery product={product} />
              <p className="mt-4 text-[13px] leading-relaxed text-[var(--color-athens-body)]">
                <strong className="font-medium">Disclaimer:</strong> Actual product colors may
                vary slightly from the images shown due to different monitor settings and
                lighting conditions during photo shoots.
              </p>
              <ProductAccordions
                description={product.description}
                specs={specs}
                documents={documents}
                shipping={pdpContent.shipping}
                warranty={pdpContent.warranty}
                className="mt-10"
              />
            </div>

            {/*
              Right: buy column — sticks under the sticky header once the
              2-col layout kicks in (min-[990px], matching the grid
              breakpoint above), then scrolls away with the page once the
              taller left column finishes. Offset = the sticky header's
              total height at this breakpoint (mast `min-[990px]:h-[95px]`
              in site-header.tsx + mega-menu nav bar `h-[52px]` in
              mega-menu.tsx = 147px) plus 16px breathing room = 163px. The
              announcement bar above the header is NOT sticky (scrolls away
              first), so it isn't part of this offset.
            */}
            <div className="max-w-[640px] min-[990px]:sticky min-[990px]:top-[163px] min-[990px]:self-start">
              <ProductSummary product={product} />
              <BuyBox
                product={product}
                infoBox={pdpContent.infoBox}
                highlights={pdpContent.highlights}
                shipsCaption={pdpContent.shipsCaption}
              />
            </div>
          </div>
        </ProductSelectionProvider>
      </div>

      {relatedProducts.length > 0 && (
        <section className="athens-container mb-[60px]">
          <SectionHeading title="Related products" />
          <ProductGrid columns={4}>
            {relatedProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                quickViewSlot={<QuickViewButton product={p} />}
              />
            ))}
          </ProductGrid>
        </section>
      )}
    </>
  )
}
