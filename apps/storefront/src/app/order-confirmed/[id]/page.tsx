import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Order Confirmed",
  robots: { index: false },
}

export default async function OrderConfirmedPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <div className="shell py-24">
      <div className="mx-auto max-w-lg border border-[var(--color-line)] p-10 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-ok)] text-xl text-white">
          ✓
        </div>
        <h1 className="mt-6 text-2xl font-bold tracking-tight">
          Order Confirmed
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-muted)]">
          Thank you for your order. A confirmation with your GST invoice
          details will be emailed to you. Your order will be dispatched from
          our Mumbai warehouse within 24-48 hours.
        </p>
        <p className="mt-4 font-mono text-xs text-[var(--color-ink-faint)]">
          Order Ref: {id}
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/account" className="btn-primary px-6 py-2.5">
            View Orders
          </Link>
          <Link href="/products" className="btn-secondary px-6 py-2.5">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  )
}
