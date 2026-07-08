import type { Metadata } from "next"

import { CompareTable } from "@/components/product/compare-table"

export const metadata: Metadata = {
  title: "Compare products",
  robots: { index: false },
}

// Compare selection is user-specific (localStorage) and rendered
// client-side (CSR) — this server shell only carries metadata. `CompareProvider`
// is now mounted globally in `app/layout.tsx` (T25 integration), so this page
// no longer mounts its own — the context re-reads `_ck_compare` from
// localStorage on mount regardless of where it's placed, so the page still
// works standalone/shareable via the global provider.
export default function ComparePage() {
  return (
    <section className="athens-container my-[60px]">
      <h1 className="athens-section-heading mb-8">Compare products</h1>
      <CompareTable />
    </section>
  )
}
