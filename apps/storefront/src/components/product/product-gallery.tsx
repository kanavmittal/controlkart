"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import dynamic from "next/dynamic"
import useEmblaCarousel from "embla-carousel-react"
import { ChevronLeft, ChevronRight, Search } from "lucide-react"
import { HttpTypes } from "@medusajs/types"
import { useProductSelection } from "@/components/providers/product-selection-provider"
import { cn } from "@/lib/utils"

const ProductZoomLightbox = dynamic(() => import("./product-zoom-lightbox"), {
  ssr: false,
})

type GalleryImage = { id: string; url: string; rank: number }

/** Stable order: image rank, then id (the variant↔image link has no per-variant
 * rank and product ranks often collide at 0, so the id tiebreaker keeps SSR and
 * client renders deterministic). */
function sortImages(images: GalleryImage[]): GalleryImage[] {
  return [...images].sort(
    (a, b) => a.rank - b.rank || a.id.localeCompare(b.id)
  )
}

function normalize(
  images: HttpTypes.StoreProduct["images"] | undefined | null
): GalleryImage[] {
  return (images ?? []).map((img) => ({
    id: img.id,
    url: img.url,
    rank: typeof img.rank === "number" ? img.rank : 0,
  }))
}

/**
 * Variant-aware PDP gallery. Reads the selected variant from shared PDP context
 * and shows that variant's curated images (native Medusa `variant.images`),
 * falling back to all product images, then the product thumbnail, then a
 * placeholder. Renders with next/image (priority on the first slide of the
 * initial variant) so the LCP image is server-rendered and optimized.
 *
 * Ported wholesale from `products/product-gallery.tsx` (variant image subset,
 * Embla main viewport, lazy zoom lightbox) — restyled to the Athens look from
 * `my-clone/src/components/ProductGallery.tsx` (white square media with a
 * hairline `--color-athens-line` ring, bordered active thumb, top-right zoom
 * affordance icon, thumb rail left-of/below the main image).
 */
export function ProductGallery({
  product,
}: {
  product: HttpTypes.StoreProduct
}) {
  const variants = useMemo(() => product.variants ?? [], [product.variants])
  const firstVariantId = variants[0]?.id
  const { selectedVariantId } = useProductSelection()

  const selectedVariant = useMemo(
    () =>
      variants.find((v) => v.id === selectedVariantId) ?? variants[0],
    [variants, selectedVariantId]
  )

  // variant.images is a curated SUBSET of product images — use it when present,
  // otherwise fall back to all product images. Never concatenate the two.
  const visible = useMemo(() => {
    const variantImages = normalize(selectedVariant?.images)
    const base = variantImages.length
      ? variantImages
      : normalize(product.images)
    return sortImages(base)
  }, [selectedVariant, product.images])

  const isPrimaryVariant =
    !selectedVariantId || selectedVariantId === firstVariantId

  // Lightbox: mount lazily only after the first open so its chunk + CSS stay off
  // the initial load.
  const [lightboxMounted, setLightboxMounted] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const openZoom = useCallback((index: number) => {
    setLightboxIndex(index)
    setLightboxMounted(true)
    setLightboxOpen(true)
  }, [])

  const slides = useMemo(
    () =>
      visible.map((img, i) => ({
        src: img.url,
        alt: `${product.title} — image ${i + 1}`,
      })),
    [visible, product.title]
  )

  // No images at all → thumbnail, then the original "coming soon" placeholder.
  if (visible.length === 0) {
    return (
      <div className="relative flex aspect-square items-center justify-center rounded-[var(--radius)] bg-white shadow-[0_0_0_1px_var(--color-athens-line)]">
        {product.thumbnail ? (
          <Image
            src={product.thumbnail}
            alt={product.title}
            fill
            className="object-contain p-8"
            sizes="(min-width: 990px) 620px, 100vw"
            priority
          />
        ) : (
          <span className="font-mono text-sm text-[var(--color-athens-body)]">
            Product image coming soon
          </span>
        )}
      </div>
    )
  }

  return (
    <>
      {/* key remounts the carousel on variant change → clean reset to slide 0 */}
      <GalleryCarousel
        key={selectedVariant?.id ?? "default"}
        images={visible}
        title={product.title}
        isPrimaryVariant={isPrimaryVariant}
        onOpenZoom={openZoom}
      />
      {lightboxMounted && (
        <ProductZoomLightbox
          open={lightboxOpen}
          index={lightboxIndex}
          slides={slides}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  )
}

function ZoomAffordance() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute right-4 top-4 inline-flex size-9 items-center justify-center rounded-full border border-[var(--color-athens-line)] bg-white text-[var(--color-athens-blue)]"
    >
      <Search className="size-[18px]" />
    </span>
  )
}

function GalleryCarousel({
  images,
  title,
  isPrimaryVariant,
  onOpenZoom,
}: {
  images: GalleryImage[]
  title: string
  isPrimaryVariant: boolean
  onOpenZoom: (index: number) => void
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false })
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
    setCanPrev(emblaApi.canScrollPrev())
    setCanNext(emblaApi.canScrollNext())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on("select", onSelect)
    emblaApi.on("reInit", onSelect)
    return () => {
      emblaApi.off("select", onSelect)
      emblaApi.off("reInit", onSelect)
    }
  }, [emblaApi, onSelect])

  const scrollTo = useCallback(
    (i: number) => emblaApi?.scrollTo(i),
    [emblaApi]
  )

  // Single image → no carousel chrome, no thumbnail rail.
  if (images.length === 1) {
    return (
      <button
        type="button"
        onClick={() => onOpenZoom(0)}
        aria-label="Open full-size image"
        className="relative flex aspect-square w-full cursor-zoom-in items-center justify-center rounded-[var(--radius)] bg-white shadow-[0_0_0_1px_var(--color-athens-line)]"
      >
        <Image
          src={images[0].url}
          alt={title}
          fill
          className="object-contain p-8"
          sizes="(min-width: 990px) 620px, 100vw"
          priority={isPrimaryVariant}
        />
        <ZoomAffordance />
      </button>
    )
  }

  return (
    <div className="flex flex-col-reverse gap-3 min-[990px]:flex-row">
      {/* Thumbnail rail: horizontal row under the image on mobile, vertical
          column to the left on desktop. Fixed thumb size reserves space (no CLS). */}
      <div className="flex flex-row gap-3 overflow-x-auto min-[990px]:max-h-[620px] min-[990px]:w-[88px] min-[990px]:flex-col min-[990px]:overflow-x-visible min-[990px]:overflow-y-auto">
        {images.map((img, i) => {
          const active = i === selectedIndex
          return (
            <button
              key={img.id}
              type="button"
              onClick={() => scrollTo(i)}
              aria-label={`Show image ${i + 1}`}
              aria-current={active}
              className={cn(
                "relative aspect-square w-[88px] shrink-0 cursor-pointer rounded-[var(--radius)] bg-white p-1.5 transition-shadow min-[990px]:w-auto",
                active
                  ? "shadow-[0_0_0_1px_var(--color-athens-blue)]"
                  : "shadow-[0_0_0_1px_var(--color-athens-line)] hover:shadow-[0_0_0_1px_var(--color-athens-dark)]"
              )}
            >
              <Image
                src={img.url}
                alt=""
                fill
                className="object-contain p-1.5"
                sizes="88px"
              />
            </button>
          )
        })}
      </div>

      {/* Main viewport */}
      <div
        className="relative aspect-square flex-1 overflow-hidden rounded-[var(--radius)] bg-white shadow-[0_0_0_1px_var(--color-athens-line)]"
        ref={emblaRef}
      >
        <div className="flex h-full">
          {images.map((img, i) => (
            <div
              key={img.id}
              className="relative h-full flex-[0_0_100%]"
              aria-hidden={i !== selectedIndex}
            >
              <button
                type="button"
                onClick={() => onOpenZoom(i)}
                tabIndex={i === selectedIndex ? 0 : -1}
                aria-label={`Open image ${i + 1} of ${images.length} full size`}
                className="absolute inset-0 cursor-zoom-in"
              >
                <Image
                  src={img.url}
                  alt={`${title} — image ${i + 1}`}
                  fill
                  className="object-contain p-8"
                  sizes="(min-width: 990px) 620px, 100vw"
                  priority={isPrimaryVariant && i === 0}
                />
              </button>
            </div>
          ))}
        </div>

        <ZoomAffordance />

        <button
          type="button"
          onClick={() => emblaApi?.scrollPrev()}
          disabled={!canPrev}
          aria-label="Previous image"
          className="absolute left-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--color-athens-line)] bg-white text-[var(--color-athens-dark)] transition-colors hover:border-[var(--color-athens-dark)] disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronLeft className="size-[18px]" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => emblaApi?.scrollNext()}
          disabled={!canNext}
          aria-label="Next image"
          className="absolute right-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--color-athens-line)] bg-white text-[var(--color-athens-dark)] transition-colors hover:border-[var(--color-athens-dark)] disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronRight className="size-[18px]" aria-hidden />
        </button>
      </div>
    </div>
  )
}
