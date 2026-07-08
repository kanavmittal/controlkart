import type { Metadata } from "next"
import type { HttpTypes } from "@medusajs/types"

import { HeroSlideshow } from "@/components/home/hero-slideshow"
import { PromoTilesRow } from "@/components/home/promo-tiles-row"
import { DealsTabs } from "@/components/home/deals-tabs"
import { FiltersBar, SectionDivider } from "@/components/home/filters-bar"
import { PopularCategories } from "@/components/home/popular-categories"
import { ShopByBrand } from "@/components/home/shop-by-brand"
import { AlsoPopular } from "@/components/home/also-popular"
import { CountdownBanner } from "@/components/home/countdown-banner"
import { ProductComparison } from "@/components/home/product-comparison"
import { ScrollingMarquee } from "@/components/home/scrolling-marquee"
import { FeaturedProduct } from "@/components/home/featured-product"
import { VideoBackground } from "@/components/home/video-background"
import { ProductLists } from "@/components/home/product-lists"
import { SlidingPanels } from "@/components/home/sliding-panels"
import { FeaturedCollection } from "@/components/home/featured-collection"
import { SimpleCollectionList } from "@/components/home/simple-collection-list"
import { MediaWithText } from "@/components/home/media-with-text"
import { BlogPosts } from "@/components/home/blog-posts"
import {
  dealsTabs,
  featuredCollection,
  featuredProductHandle,
  homeComparisonHandles,
  productListColumns,
} from "@/config/home"
import { listTopLevelCategories } from "@/lib/data/categories"
import { getProductByHandle, getProductSpecs } from "@/lib/data/products"
import { listPosts } from "@/lib/data/content"
import type { SpecValueDTO } from "@/lib/data/types"

// Static route (like /categories): rendered at build time and revalidated on
// an ISR window. Every fetch below carries a `.catch` fallback so a down
// backend degrades to config-only sections instead of failing the build.
export const revalidate = 300

// Title/description/OG inherit the layout defaults (the old home page
// exported no metadata of its own); the canonical is pinned per-route,
// matching the other indexable pages.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
}

/**
 * Home assembly (T57). Server page: batches all live data in one
 * `Promise.all`, then distributes products to sections by handle.
 *
 * Product strategy: `lib/data/products.ts` (untouchable) exposes no
 * `handle[]` batch filter on `listProducts` (its `storeFetch` query only
 * serializes scalar params), so the handle lists from `config/home.ts`
 * (deals tabs + featured product + featured collection + home comparison +
 * product-list columns)
 * are DEDUPED into one set and resolved with one cached
 * `getProductByHandle` call per unique handle, in parallel. Handles that
 * don't resolve (placeholder config handles, backend down) simply drop out
 * of their sections — every product-bearing section renders nothing (or
 * skips) when it has no data.
 *
 * Section order mirrors the clone's `src/app/page.tsx` top-to-bottom.
 * The layout provides the `<main>` wrapper and all chrome.
 */
export default async function HomePage() {
  // Dedupe product handles across every product-bearing section.
  const uniqueHandles = [
    ...new Set(
      [
        ...dealsTabs.flatMap((tab) => tab.handles),
        featuredProductHandle,
        ...featuredCollection.handles,
        ...homeComparisonHandles,
        ...productListColumns.flatMap((column) => column.handles),
      ].filter(Boolean)
    ),
  ]

  const [categories, posts, resolvedProducts] = await Promise.all([
    listTopLevelCategories().catch(() => []),
    listPosts({ limit: 4 })
      .then(({ posts }) => posts)
      .catch(() => []),
    Promise.all(
      uniqueHandles.map((handle) =>
        getProductByHandle(handle).catch(() => null)
      )
    ),
  ])

  const productsByHandle = new Map<string, HttpTypes.StoreProduct>()
  for (const product of resolvedProducts) {
    if (product?.handle) productsByHandle.set(product.handle, product)
  }
  const pick = (handles: string[]) =>
    handles
      .map((handle) => productsByHandle.get(handle))
      .filter((p): p is HttpTypes.StoreProduct => Boolean(p))

  // Distribute by handle.
  const tabs = dealsTabs.map((tab) => ({
    brandLabel: tab.brandLabel,
    products: pick(tab.handles),
  }))
  const featuredProduct = productsByHandle.get(featuredProductHandle) ?? null
  const featuredCollectionProducts = pick(featuredCollection.handles)
  const comparisonProducts = pick(homeComparisonHandles)
  const productListColumnsData = productListColumns.map((column) => ({
    banner: column.banner,
    products: pick(column.handles),
  }))

  // Specs for the pinned comparison table only (one call per product).
  const comparisonSpecs = await Promise.all(
    comparisonProducts.map((product) =>
      getProductSpecs(product.id).catch(() => [] as SpecValueDTO[])
    )
  )
  const specsByProductId: Record<string, SpecValueDTO[]> = {}
  comparisonProducts.forEach((product, index) => {
    specsByProductId[product.id] = comparisonSpecs[index]
  })

  return (
    <div>
      <HeroSlideshow />
      <PromoTilesRow />
      <DealsTabs tabs={tabs} />
      <FiltersBar categories={categories} />
      <SectionDivider />
      <PopularCategories />
      <ShopByBrand />
      <AlsoPopular />
      <CountdownBanner />
      <ProductComparison
        products={comparisonProducts}
        specsByProductId={specsByProductId}
      />
      <ScrollingMarquee />
      {featuredProduct ? <FeaturedProduct product={featuredProduct} /> : null}
      <VideoBackground />
      <ProductLists columns={productListColumnsData} />
      <SlidingPanels />
      {featuredCollectionProducts.length > 0 ? (
        <FeaturedCollection
          heading={featuredCollection.heading}
          products={featuredCollectionProducts}
          promoTile={featuredCollection.promoTile}
        />
      ) : null}
      <SimpleCollectionList />
      <MediaWithText />
      <BlogPosts posts={posts} />
    </div>
  )
}
