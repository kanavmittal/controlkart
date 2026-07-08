// TEMP — delete in T62
//
// Scratch visual-check page for T3: renders every `Button` variant/size next
// to the raw `.athens-btn` / `.athens-btn-outline` / `.athens-btn-ghost`
// elements so the CVA translation in `components/ui/button.tsx` can be
// compared against the source CSS by eye. Not linked from anywhere.
// Excluded from indexing via `robots` metadata below; MUST be deleted in T62
// (dead-code sweep) along with this whole route.

import type { Metadata } from "next"
import { Plus, ArrowRight, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

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
    </div>
  )
}
