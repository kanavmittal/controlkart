// TEMP — delete in T62
//
// Scratch visual-check page for T3: renders every `Button` variant/size next
// to the raw `.athens-btn` / `.athens-btn-outline` / `.athens-btn-ghost`
// elements so the CVA translation in `components/ui/button.tsx` can be
// compared against the source CSS by eye. Not linked from anywhere.
// Excluded from indexing via `robots` metadata below; MUST be deleted in T62
// (dead-code sweep) along with this whole route.

import type { Metadata } from "next"
import type { HttpTypes } from "@medusajs/types"
import { Plus, ArrowRight, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SectionHeading } from "@/components/shared/section-heading"
import { Breadcrumbs } from "@/components/shared/breadcrumbs"
import { Price } from "@/components/shared/price"
import { StockPill } from "@/components/shared/stock-pill"
import { ProductBadges, deriveProductBadges } from "@/components/shared/product-badges"

export const dynamic = "force-static"

export const metadata: Metadata = {
  title: "Style check (temp)",
  robots: { index: false },
}

const variants = [
  "default",
  "secondary",
  "outline",
  "ghost",
  "destructive",
  "link",
] as const

const sizes = ["xs", "sm", "default", "lg"] as const

// Mock products for the T6 shared-primitives demo section below — enough
// fields for `deriveProductBadges` to exercise sale/new/sold-out, cast
// through `unknown` since a full StoreProduct has many more required
// fields we don't need for this scratch page.
const mockSaleProduct = {
  created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  variants: [
    {
      manage_inventory: true,
      allow_backorder: false,
      inventory_quantity: 12,
      calculated_price: { calculated_amount: 3499, original_amount: 4999 },
    },
  ],
} as unknown as HttpTypes.StoreProduct

const mockSoldOutProduct = {
  created_at: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(),
  variants: [
    {
      manage_inventory: true,
      allow_backorder: false,
      inventory_quantity: 0,
      calculated_price: { calculated_amount: 1299, original_amount: 1299 },
    },
  ],
} as unknown as HttpTypes.StoreProduct

const mockPlainProduct = {
  created_at: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(),
  variants: [
    {
      manage_inventory: true,
      allow_backorder: false,
      inventory_quantity: 40,
      calculated_price: { calculated_amount: 899, original_amount: 899 },
    },
  ],
} as unknown as HttpTypes.StoreProduct

export default function StyleCheckPage() {
  return (
    <div className="athens-container flex flex-col gap-12 py-12">
      <header>
        <h1 className="athens-section-heading">Style check (temp — delete in T62)</h1>
        <p className="mt-2 text-sm text-[#676767]">
          Left column: shadcn <code>Button</code> variants driven by the CVA
          translation in <code>components/ui/button.tsx</code>. Right column:
          the raw <code>.athens-btn*</code> classes from{" "}
          <code>globals.css</code> for side-by-side comparison. Height,
          radius, and color should match within each row.
        </p>
      </header>

      <section className="flex flex-col gap-6">
        <h2 className="athens-section-heading text-lg">Variants (default size)</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-4 rounded-[5px] border border-[#dfdfdf] p-6">
            <p className="text-xs font-medium tracking-wide text-[#676767] uppercase">
              Button component
            </p>
            <div className="flex flex-wrap items-center gap-4">
              {variants.map((variant) => (
                <Button key={variant} variant={variant}>
                  {variant}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-4 rounded-[5px] border border-[#dfdfdf] p-6">
            <p className="text-xs font-medium tracking-wide text-[#676767] uppercase">
              Raw .athens-btn* classes
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <button className="athens-btn">default</button>
              <button className="athens-btn" style={{ backgroundColor: "#287dff" }}>
                secondary
              </button>
              <button className="athens-btn-outline">outline</button>
              <button className="athens-btn-ghost">ghost</button>
              <button className="athens-btn" style={{ backgroundColor: "#c61c1c" }}>
                destructive
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="athens-section-heading text-lg">Sizes</h2>
        <div className="flex flex-wrap items-center gap-4 rounded-[5px] border border-[#dfdfdf] p-6">
          {sizes.map((size) => (
            <Button key={size} size={size}>
              {size}
            </Button>
          ))}
          <Button size="icon" aria-label="icon default">
            <Plus />
          </Button>
          <Button size="icon-sm" aria-label="icon sm" variant="ghost">
            <Trash2 />
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="athens-section-heading text-lg">With icons (data-icon)</h2>
        <div className="flex flex-wrap items-center gap-4 rounded-[5px] border border-[#dfdfdf] p-6">
          <Button data-icon="inline-end">
            Shop now
            <ArrowRight />
          </Button>
          <Button variant="outline" data-icon="inline-end">
            Add to cart
            <Plus />
          </Button>
          <Button variant="ghost" data-icon="inline-start">
            <ArrowRight />
            All categories
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="athens-section-heading text-lg">Disabled state</h2>
        <div className="flex flex-wrap items-center gap-4 rounded-[5px] border border-[#dfdfdf] p-6">
          <Button disabled>default</Button>
          <Button variant="outline" disabled>
            outline
          </Button>
          <Button variant="ghost" disabled>
            ghost
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="athens-section-heading text-lg">T6 — Shared primitives</h2>

        <div className="flex flex-col gap-4 rounded-[5px] border border-[#dfdfdf] p-6">
          <p className="text-xs font-medium tracking-wide text-[#676767] uppercase">
            SectionHeading
          </p>
          <SectionHeading
            title="Power Tools"
            actionLabel="View all"
            actionHref="/products"
            className="mb-0"
          />
        </div>

        <div className="flex flex-col gap-4 rounded-[5px] border border-[#dfdfdf] p-6">
          <p className="text-xs font-medium tracking-wide text-[#676767] uppercase">
            Breadcrumbs
          </p>
          <Breadcrumbs
            crumbs={[
              { label: "Power Tools", href: "/categories/power-tools" },
              { label: "Angle Grinders" },
            ]}
          />
        </div>

        <div className="flex flex-col gap-4 rounded-[5px] border border-[#dfdfdf] p-6">
          <p className="text-xs font-medium tracking-wide text-[#676767] uppercase">Price</p>
          <div className="flex flex-wrap items-center gap-8">
            <Price amount={16609} taxNote />
            <Price amount={3499} originalAmount={4999} taxNote />
            <Price amount={899} from taxNote />
            <Price amount={null} />
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-[5px] border border-[#dfdfdf] p-6">
          <p className="text-xs font-medium tracking-wide text-[#676767] uppercase">StockPill</p>
          <div className="flex flex-wrap items-center gap-4">
            <StockPill availableQuantity={0} />
            <StockPill availableQuantity={3} />
            <StockPill availableQuantity={40} />
            <StockPill availableQuantity={0} canBackorder />
            <StockPill availableQuantity={undefined} canBackorder />
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-[5px] border border-[#dfdfdf] p-6">
          <p className="text-xs font-medium tracking-wide text-[#676767] uppercase">
            ProductBadges + deriveProductBadges
          </p>
          <div className="flex flex-wrap items-center gap-6">
            <ProductBadges badges={deriveProductBadges(mockSaleProduct)} />
            <ProductBadges badges={deriveProductBadges(mockSoldOutProduct)} />
            <ProductBadges badges={deriveProductBadges(mockPlainProduct)} />
          </div>
        </div>
      </section>
    </div>
  )
}
