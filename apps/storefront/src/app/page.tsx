import type { Metadata } from "next"
import { HeroSlideshow } from "@/components/home/hero-slideshow"
import { AlsoPopular } from "@/components/home/also-popular"
import { ShopByBrand } from "@/components/home/shop-by-brand"
import { FeaturedCollection } from "@/components/home/featured-collection"
import { MediaWithText } from "@/components/home/media-with-text"
import { BlogPosts } from "@/components/home/blog-posts"
import { listCategories } from "@/lib/data/categories"
import { listFeaturedProducts } from "@/lib/data/featured-products"
import { listPosts } from "@/lib/data/content"

export const revalidate = 60
export const metadata: Metadata = { alternates: { canonical: "/" } }

export default async function HomePage() {
  const [categories, products, posts] = await Promise.all([
    listCategories().catch(() => []),
    listFeaturedProducts().catch(() => []),
    listPosts({ limit: 4 }).then(({ posts }) => posts).catch(() => []),
  ])

  return (
    <div>
      <HeroSlideshow />
      <AlsoPopular categories={categories} />
      <ShopByBrand />
      {products.length > 0 ? <FeaturedCollection heading="Featured Products" products={products} /> : null}
      <MediaWithText />
      <BlogPosts posts={posts} />
    </div>
  )
}
