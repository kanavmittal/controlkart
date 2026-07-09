"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import type { HttpTypes } from "@medusajs/types"
import { toast } from "sonner"
import { ChevronRight, Loader2, Minus, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Price } from "@/components/shared/price"
import { StockPill } from "@/components/shared/stock-pill"
import { useCart } from "@/lib/hooks/use-cart"
import { useCartDrawer } from "@/components/cart/cart-drawer-context"
import { cn } from "@/lib/utils"

interface FeaturedProductProps {
  product: HttpTypes.StoreProduct
}

/**
 * Homepage single hero product — Athens band, 2-col (gallery left, details
 * right). Ported from `my-clone/src/components/FeaturedProduct.tsx`: mini
 * thumb-switching gallery (local state, not the Embla PDP gallery), vendor +
 * title, price, stock/SKU, qty stepper + Add to cart, "View full details".
 * Performance meter is dropped (no data source); no rating stars.
 *
 * `product` is supplied by T57 (server-fetched via
 * `config/home.ts`'s `featuredProductHandle`) — renders nothing if it's
 * ever missing so this section fails soft rather than crashing the page.
 *
 * Price/stock derivation mirrors `product/product-card.tsx` (min calculated
 * price + aggregated stock across variants); Add to cart follows the
 * app-wide `product-card-actions.tsx` pattern (`useCart().addItem` + sonner
 * toast + cart-drawer `openDrawer`), extended with a quantity stepper (qty
 * clamping styled after `product/buy-box.tsx`'s stepper markup — that
 * component itself isn't reusable here, it depends on PDP-only
 * `useProductSelection`/`useProductLive` context). Single-variant assumption
 * per clone: multi-variant products render a "Select options" outline
 * button to the PDP instead, same as `ProductCard`.
 */
export function FeaturedProduct({ product }: FeaturedProductProps) {
  if (!product) return null

  return <FeaturedProductContent product={product} />
}

function FeaturedProductContent({
  product,
}: {
  product: HttpTypes.StoreProduct
}) {
  const variants = product.variants ?? []
  const multiVariant = variants.length > 1
  const singleVariant = !multiVariant ? variants[0] : undefined
  const href = `/products/${product.handle}`

  const images = useMemo(() => {
    const productImages = (product.images ?? [])
      .filter((image): image is typeof image & { url: string } => Boolean(image.url))
      .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0) || a.id.localeCompare(b.id))
      .map((image) => image.url)
    if (productImages.length) return productImages
    return product.thumbnail ? [product.thumbnail] : []
  }, [product.images, product.thumbnail])

  const [activeIndex, setActiveIndex] = useState(0)
  const activeImage = images[activeIndex] ?? images[0]

  const priceEntries = variants
    .map((variant) => variant.calculated_price)
    .filter(
      (price): price is NonNullable<typeof price> =>
        typeof price?.calculated_amount === "number"
    )
  const cheapestPrice = priceEntries.length
    ? priceEntries.reduce((min, price) =>
        price.calculated_amount! < min.calculated_amount! ? price : min
      )
    : null
  const distinctCalculatedAmounts = new Set(
    priceEntries.map((price) => price.calculated_amount)
  )
  const priceFrom = multiVariant && distinctCalculatedAmounts.size > 1

  const totalStock = variants.reduce(
    (acc, variant) => acc + (variant.inventory_quantity ?? 0),
    0
  )
  const canBackorder = variants.some(
    (variant) =>
      variant.manage_inventory === false || variant.allow_backorder === true
  )

  const brand = product.metadata?.brand as string | undefined
  const mpn = (product.metadata?.mpn as string | undefined) || variants[0]?.sku || undefined

  return (
    <section className="bg-athens-band mb-[60px]">
      <div className="athens-container py-[60px]">
        <div className="grid grid-cols-1 gap-[60px] min-[990px]:grid-cols-2">
          {/* Gallery */}
          <div className="flex flex-col gap-3 min-[990px]:flex-row">
            {images.length > 1 && (
              <div className="order-2 flex flex-row gap-3 min-[990px]:order-1 min-[990px]:w-[88px] min-[990px]:flex-col">
                {images.map((url, index) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    aria-label={`View image ${index + 1}`}
                    aria-current={index === activeIndex}
                    className={cn(
                      "aspect-square w-[88px] cursor-pointer rounded-[var(--radius)] bg-white p-2 min-[990px]:w-auto",
                      index === activeIndex
                        ? "shadow-[0_0_0_1px_var(--color-athens-blue)]"
                        : "shadow-[0_0_0_1px_var(--color-athens-line)]"
                    )}
                  >
                    <Image
                      src={url}
                      alt=""
                      width={1200}
                      height={1200}
                      className="h-full w-full object-contain"
                    />
                  </button>
                ))}
              </div>
            )}
            <div className="order-1 aspect-square flex-1 rounded-[var(--radius)] bg-white p-10 shadow-[0_0_0_1px_var(--color-athens-line)] min-[990px]:order-2">
              {activeImage ? (
                <Image
                  src={activeImage}
                  alt={product.title}
                  width={1200}
                  height={1200}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-center font-mono text-xs text-[var(--color-athens-body)]">
                  {mpn ?? product.title}
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="max-w-[640px]">
            {brand ? (
              <p className="mb-1 text-[13px] text-[var(--color-athens-body)]">{brand}</p>
            ) : null}
            <h2 className="mb-3 text-[24px] font-medium leading-[1.3] text-[var(--color-athens-dark)]">
              {product.title}
            </h2>

            <div className="mb-5 flex items-center gap-3">
              <StockPill availableQuantity={totalStock} canBackorder={canBackorder} />
              {mpn ? (
                <span className="text-[13px] text-[var(--color-athens-body)]">SKU: {mpn}</span>
              ) : null}
            </div>

            <div className="mb-5 border-t border-[var(--color-athens-line)]" />

            <Price
              amount={cheapestPrice?.calculated_amount ?? null}
              originalAmount={cheapestPrice?.original_amount ?? null}
              from={priceFrom}
              taxNote
              className="mb-6"
            />

            {multiVariant ? (
              <Button variant="outline" className="w-full" render={<Link href={href} />}>
                Select options
              </Button>
            ) : singleVariant ? (
              <FeaturedProductAddToCart
                variant={singleVariant}
                productTitle={product.title}
              />
            ) : null}

            <Link
              href={href}
              data-icon="inline-end"
              className="mt-5 inline-flex items-center gap-1 text-[15px] text-primary hover:underline"
            >
              View full details
              <ChevronRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

/**
 * Single-variant qty stepper + Add to cart. Same mutation/toast/drawer
 * pattern as `product/product-card-actions.tsx`; the stepper UI (bordered
 * box, Minus/Plus icon buttons) is styled after `product/buy-box.tsx`'s qty
 * control without taking on that component's PDP-only live price/stock or
 * variant-selection dependencies.
 */
function FeaturedProductAddToCart({
  variant,
  productTitle,
}: {
  variant: HttpTypes.StoreProductVariant
  productTitle: string
}) {
  const { addItem } = useCart()
  const { openDrawer } = useCartDrawer()
  const [quantity, setQuantity] = useState(1)

  const stock = variant.inventory_quantity ?? 0
  const canBackorder =
    variant.manage_inventory === false || variant.allow_backorder === true
  const purchasable = canBackorder || stock > 0
  const maxQty = purchasable ? (stock > 0 ? stock : 99) : 0

  const onAddToCart = () => {
    addItem.mutate(
      { variantId: variant.id, quantity: Math.min(quantity, maxQty) },
      {
        onSuccess: () => {
          toast.success(`Added ${productTitle} to cart`)
          openDrawer()
        },
        onError: () => {
          toast.error("Couldn't add to cart. Please try again.")
        },
      }
    )
  }

  return (
    <div className="flex gap-3">
      <div className="flex h-11 shrink-0 items-center border border-[var(--color-athens-line)]">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="h-11 w-10 rounded-none border-0"
          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          disabled={quantity <= 1}
          aria-label="Decrease quantity"
        >
          <Minus />
        </Button>
        <span className="flex w-10 items-center justify-center text-sm font-medium tabular-nums">
          {quantity}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="h-11 w-10 rounded-none border-0"
          onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
          disabled={quantity >= maxQty}
          aria-label="Increase quantity"
        >
          <Plus />
        </Button>
      </div>
      <Button
        type="button"
        variant="secondary"
        className="flex-1"
        onClick={onAddToCart}
        disabled={addItem.isPending || !purchasable}
        aria-busy={addItem.isPending}
      >
        {addItem.isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Adding…
          </>
        ) : !purchasable ? (
          "Out of stock"
        ) : (
          "Add to cart"
        )}
      </Button>
    </div>
  )
}
