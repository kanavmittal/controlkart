import type { Metadata } from "next"
import { QuoteForm } from "./quote-form"

export const metadata: Metadata = {
  title: "Request a Bulk Quote",
  description:
    "Request trade pricing for bulk Selec PLC and automation component orders. Response within one working day.",
  alternates: { canonical: "/request-quote" },
}

export default async function RequestQuotePage({
  searchParams,
}: {
  searchParams: Promise<{ sku?: string }>
}) {
  const { sku } = await searchParams

  return (
    <div className="shell py-12">
      <div className="grid gap-12 lg:grid-cols-[1fr_360px]">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight">
            Request a Bulk Quote
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-muted)]">
            Buying in volume? Send us your requirement and our team will
            respond with trade pricing and lead times within one working day.
          </p>
          <div className="mt-8">
            <QuoteForm initialSku={sku} />
          </div>
        </div>
        <aside className="h-fit border border-[var(--color-line)] bg-[var(--color-surface-alt)] p-6 text-sm leading-relaxed text-[var(--color-ink-muted)]">
          <h2 className="text-sm font-semibold text-[var(--color-ink)]">
            How it works
          </h2>
          <ol className="mt-3 list-decimal space-y-2 pl-4">
            <li>Submit your SKUs, quantities and delivery pincode.</li>
            <li>Our team reviews stock and applies trade pricing.</li>
            <li>You receive a formal quote by email with validity.</li>
            <li>Accept the quote and we convert it to an order.</li>
          </ol>
        </aside>
      </div>
    </div>
  )
}
