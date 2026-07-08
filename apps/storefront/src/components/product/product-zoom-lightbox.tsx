"use client"

import Lightbox from "yet-another-react-lightbox"
import Zoom from "yet-another-react-lightbox/plugins/zoom"
import "yet-another-react-lightbox/styles.css"

/**
 * Fullscreen, zoomable image overlay. Imported lazily via next/dynamic
 * (ssr:false) from the gallery so this whole bundle + its CSS is code-split
 * into a chunk that's only fetched the first time a shopper opens zoom —
 * keeping it off the SSR/LCP path entirely.
 *
 * Ported verbatim from `products/product-zoom-lightbox.tsx` — no restyle
 * needed here, it's a fullscreen overlay outside the Athens card chrome.
 */
export default function ProductZoomLightbox({
  open,
  index,
  slides,
  onClose,
}: {
  open: boolean
  index: number
  slides: { src: string; alt?: string }[]
  onClose: () => void
}) {
  return (
    <Lightbox
      open={open}
      index={index}
      close={onClose}
      slides={slides}
      plugins={[Zoom]}
      zoom={{ maxZoomPixelRatio: 3 }}
      controller={{ closeOnBackdropClick: true }}
      styles={{ container: { backgroundColor: "rgba(0,0,0,.9)" } }}
    />
  )
}
