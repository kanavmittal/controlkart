import type { Metadata } from "next"
import { ClipboardCheck, FileText, Mail, PackageCheck } from "lucide-react"

import { Breadcrumbs } from "@/components/shared/breadcrumbs"
import { QuoteForm } from "./quote-form"

export const metadata: Metadata = {
  title: "Request a Bulk Quote",
  description:
    "Request trade pricing for bulk Selec PLC and automation component orders. Response within one working day.",
  alternates: { canonical: "/request-quote" },
}

// Copy is verbatim from the previous page.tsx — restyled below as icon steps.
const HOW_IT_WORKS = [
  {
    icon: FileText,
    text: "Submit your SKUs, quantities and delivery pincode.",
  },
  {
    icon: ClipboardCheck,
    text: "Our team reviews stock and applies trade pricing.",
  },
  {
    icon: Mail,
    text: "You receive a formal quote by email with validity.",
  },
  {
    icon: PackageCheck,
    text: "Accept the quote and we convert it to an order.",
  },
] as const

export default async function RequestQuotePage({
  searchParams,
}: {
  searchParams: Promise<{ sku?: string }>
}) {
  const { sku } = await searchParams

  return (
    <>
      <Breadcrumbs crumbs={[{ label: "Request a Quote" }]} />

      <div className="athens-container py-10 md:py-14">
        <div className="max-w-2xl">
          <h1 className="athens-page-title">Request a Bulk Quote</h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--color-athens-body)]">
            Buying in volume? Send us your requirement and our team will respond with
            trade pricing and lead times within one working day.
          </p>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start lg:gap-12">
          <QuoteForm initialSku={sku} />

          <aside className="h-fit rounded-[var(--radius)] border border-[var(--color-athens-line)] bg-[var(--color-athens-band)] p-6">
            <h2 className="athens-section-heading text-base">How it works</h2>
            <ol className="mt-5 flex flex-col gap-5">
              {HOW_IT_WORKS.map((step, index) => (
                <li key={step.text} className="flex gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-athens-blue)]/10 text-[var(--color-athens-blue)]">
                    <step.icon className="size-4" aria-hidden />
                    <span className="sr-only">Step {index + 1}</span>
                  </span>
                  <p className="text-sm leading-relaxed text-[var(--color-athens-body)]">
                    {step.text}
                  </p>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </div>
    </>
  )
}
