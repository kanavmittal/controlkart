import type { Metadata } from "next"
import { Suspense } from "react"

import { Breadcrumbs } from "@/components/shared/breadcrumbs"
import { QuickOrderForm } from "./quick-order-form"

export const metadata: Metadata = {
  title: "Quick Order by SKU",
  description:
    "Enter Selec SKU codes and quantities to build your cart instantly. Built for repeat industrial procurement.",
  alternates: { canonical: "/quick-order" },
}

// `QuickOrderForm` reads `?sku=` via useSearchParams (NEW: quick-order prefill),
// which requires a Suspense boundary so the route can still prerender.
export default function QuickOrderPage() {
  return (
    <>
      <Breadcrumbs crumbs={[{ label: "Quick Order" }]} />

      <div className="athens-container py-10 md:py-14">
        <div className="max-w-2xl">
          <h1 className="athens-section-heading text-[32px]">Quick Order</h1>
          <p className="mt-3 text-sm leading-relaxed text-athens-body">
            Paste or type one SKU per line with quantity, separated by a comma
            or space. We will validate stock and add everything to your cart
            in one step.
          </p>
        </div>

        <div className="mt-8 max-w-2xl">
          <Suspense>
            <QuickOrderForm />
          </Suspense>
        </div>

        <div className="mt-8 max-w-2xl rounded-[var(--radius)] border border-athens-line bg-athens-band p-4 text-xs leading-relaxed text-athens-body">
          <strong className="text-athens-dark">Example</strong>
          <pre className="mt-2 font-mono">{`MIBRX-6M-1-1-1-230V, 5
MIBRX-DSP-6M-8-2-08-A, 5
MIBRX-DSP-AP-6M, 10`}</pre>
        </div>
      </div>
    </>
  )
}
