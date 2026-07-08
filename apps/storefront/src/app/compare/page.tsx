import type { Metadata } from "next"

import { CompareProvider } from "@/components/product/compare-context"
import { CompareTable } from "@/components/product/compare-table"

export const metadata: Metadata = {
  title: "Compare products",
  robots: { index: false },
}

// Compare selection is user-specific (localStorage) and rendered
// client-side (CSR) — this server shell only carries metadata. Mounts its
// own `CompareProvider` so the page works standalone (the global mount is a
// later integration task — see T25 note in the plan); the context re-reads
// `_ck_compare` from localStorage on mount regardless of where it's placed.
export default function ComparePage() {
  return (
    <CompareProvider>
      <section className="athens-container my-[60px]">
        <h1 className="athens-section-heading mb-8">Compare products</h1>
        <CompareTable />
      </section>
    </CompareProvider>
  )
}
