"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import dynamic from "next/dynamic"
import useEmblaCarousel from "embla-carousel-react"
import { HttpTypes } from "@medusajs/types"
import { useProductSelection } from "@/components/providers/product-selection-provider"

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
      <div className="relative flex aspect-[4/3] items-center justify-center border border-[var(--color-line)] bg-[var(--color-surface-alt)]">
        {product.thumbnail ? (
          <Image
            src={product.thumbnail}
            alt={product.title}
            fill
            className="object-contain p-12"
            sizes="(max-width: 1024px) 100vw, (max-width: 1440px) 56vw, 810px"
            priority
          />
        ) : (
          <span className="font-mono text-sm text-[var(--color-ink-faint)]">
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
        className="relative flex aspect-[4/3] w-full cursor-zoom-in items-center justify-center border border-[var(--color-line)] bg-[var(--color-surface-alt)]"
      >
        <Image
          src={images[0].url}
          alt={title}
          fill
          className="object-contain p-12"
          sizes="(max-width: 1024px) 100vw, (max-width: 1440px) 56vw, 810px"
          priority={isPrimaryVariant}
        />
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-start">
      {/* Thumbnail rail: horizontal row under the image on mobile, vertical
          column to the left on desktop. Fixed thumb size reserves space (no CLS). */}
      <div className="order-2 flex gap-2 overflow-x-auto md:order-1 md:max-h-[520px] md:flex-col md:overflow-y-auto md:overflow-x-visible">
        {images.map((img, i) => {
          const active = i === selectedIndex
          return (
            <button
              key={img.id}
              type="button"
              onClick={() => scrollTo(i)}
              aria-label={`Show image ${i + 1}`}
              aria-current={active}
              className={`relative aspect-square w-16 shrink-0 border bg-[var(--color-surface-alt)] transition-colors md:w-20 ${
                active
                  ? "border-[var(--color-line-strong)]"
                  : "border-[var(--color-line)] hover:border-[var(--color-ink-faint)]"
              }`}
            >
              <Image
                src={img.url}
                alt=""
                fill
                className="object-contain p-1.5"
                sizes="80px"
              />
            </button>
          )
        })}
      </div>

      {/* Main viewport */}
      <div className="order-1 min-w-0 flex-1 md:order-2">
        <div
          className="relative aspect-[4/3] overflow-hidden border border-[var(--color-line)] bg-[var(--color-surface-alt)]"
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
                    className="object-contain p-12"
                    sizes="(max-width: 1024px) 100vw, (max-width: 1440px) 56vw, 810px"
                    priority={isPrimaryVariant && i === 0}
                  />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => emblaApi?.scrollPrev()}
            disabled={!canPrev}
            aria-label="Previous image"
            className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center border border-[var(--color-line)] bg-[var(--color-surface)]/90 text-lg leading-none text-[var(--color-ink)] transition-colors hover:border-[var(--color-line-strong)] disabled:pointer-events-none disabled:opacity-30"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => emblaApi?.scrollNext()}
            disabled={!canNext}
            aria-label="Next image"
            className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center border border-[var(--color-line)] bg-[var(--color-surface)]/90 text-lg leading-none text-[var(--color-ink)] transition-colors hover:border-[var(--color-line-strong)] disabled:pointer-events-none disabled:opacity-30"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  )
}
