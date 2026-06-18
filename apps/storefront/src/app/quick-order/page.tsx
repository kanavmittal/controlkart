import type { Metadata } from "next"
import { QuickOrderForm } from "./quick-order-form"

export const metadata: Metadata = {
  title: "Quick Order by SKU",
  description:
    "Enter Selec SKU codes and quantities to build your cart instantly. Built for repeat industrial procurement.",
  alternates: { canonical: "/quick-order" },
}

export default function QuickOrderPage() {
  return (
    <div className="shell py-12">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight">Quick Order</h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-muted)]">
          Paste or type one SKU per line with quantity, separated by a comma or
          space. We will validate stock and add everything to your cart in one
          step.
        </p>
        <div className="mt-8">
          <QuickOrderForm />
        </div>
        <div className="mt-8 border border-[var(--color-line)] bg-[var(--color-surface-alt)] p-4 text-xs leading-relaxed text-[var(--color-ink-muted)]">
          <strong className="text-[var(--color-ink)]">Example</strong>
          <pre className="mt-2 font-mono">{`MIBRX-6M-1-1-1-230V, 5
MIBRX-DSP-6M-8-2-08-A, 5
MIBRX-DSP-AP-6M, 10`}</pre>
        </div>
      </div>
    </div>
  )
}
