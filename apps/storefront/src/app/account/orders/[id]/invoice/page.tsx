import type { Metadata } from "next"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { storeFetch } from "@/lib/medusa"
import { authHeaders, getAuthToken } from "@/lib/data/cookies"
import { formatINR, formatDate } from "@/lib/format"

export const metadata: Metadata = {
  title: "Tax Invoice",
  robots: { index: false },
}

type Invoice = {
  invoice_number: string
  display_id: number
  date: string
  seller: { name: string; gstin: string | null; state: string }
  buyer: {
    email: string
    gstin: string | null
    billing_address: Record<string, string | null> | null
  }
  items: {
    title: string
    sku: string | null
    hsn_code: string
    quantity: number
    unit_price: number
    total: number
  }[]
  totals: {
    item_total: number
    shipping_total: number
    tax_total: number
    type: "intra_state" | "inter_state"
    cgst: number
    sgst: number
    igst: number
    grand_total: number
  }
}

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  if (!(await getAuthToken())) redirect("/account")

  let invoice: Invoice
  try {
    const res = await storeFetch<{ invoice: Invoice }>(
      `/store/orders/${id}/invoice`,
      { headers: await authHeaders(), revalidate: false }
    )
    invoice = res.invoice
  } catch {
    notFound()
  }

  const addr = invoice.buyer.billing_address

  return (
    <div className="shell max-w-4xl py-12 print:py-0">
      <div className="border border-[var(--color-line)] p-8">
        <header className="flex items-start justify-between border-b border-[var(--color-line)] pb-6">
          <div>
            <h1 className="text-xl font-bold">TAX INVOICE</h1>
            <p className="mt-1 font-mono text-sm">{invoice.invoice_number}</p>
            <p className="text-xs text-[var(--color-ink-muted)]">
              {formatDate(invoice.date)}
            </p>
          </div>
          <div className="text-right text-sm">
            <div className="font-bold">{invoice.seller.name}</div>
            <div className="text-[var(--color-ink-muted)]">
              State: {invoice.seller.state}
            </div>
            {invoice.seller.gstin && (
              <div className="font-mono text-xs">
                GSTIN: {invoice.seller.gstin}
              </div>
            )}
          </div>
        </header>

        <section className="grid grid-cols-2 gap-8 border-b border-[var(--color-line)] py-6 text-sm">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
              Bill To
            </h2>
            <div className="mt-2">
              {addr?.first_name} {addr?.last_name}
              {addr?.company && <div>{addr.company}</div>}
              <div>{addr?.address_1}</div>
              {addr?.address_2 && <div>{addr.address_2}</div>}
              <div>
                {addr?.city}, {addr?.province} {addr?.postal_code}
              </div>
              <div>{invoice.buyer.email}</div>
            </div>
          </div>
          {invoice.buyer.gstin && (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
                Buyer GSTIN
              </h2>
              <div className="mt-2 font-mono">{invoice.buyer.gstin}</div>
            </div>
          )}
        </section>

        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-line-strong)] text-left text-xs uppercase tracking-wide text-[var(--color-ink-muted)]">
              <th className="py-2">Item</th>
              <th className="py-2">HSN</th>
              <th className="py-2 text-right">Qty</th>
              <th className="py-2 text-right">Rate</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, i) => (
              <tr key={i} className="border-b border-[var(--color-line)]">
                <td className="py-2">
                  {item.title}
                  <div className="font-mono text-xs text-[var(--color-ink-muted)]">
                    {item.sku}
                  </div>
                </td>
                <td className="py-2 font-mono text-xs">{item.hsn_code}</td>
                <td className="py-2 text-right">{item.quantity}</td>
                <td className="py-2 text-right">{formatINR(item.unit_price)}</td>
                <td className="py-2 text-right">{formatINR(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 ml-auto w-72 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--color-ink-muted)]">Taxable + Tax</span>
            <span>{formatINR(invoice.totals.item_total)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--color-ink-muted)]">Shipping</span>
            <span>{formatINR(invoice.totals.shipping_total)}</span>
          </div>
          {invoice.totals.type === "intra_state" ? (
            <>
              <div className="flex justify-between">
                <span className="text-[var(--color-ink-muted)]">CGST</span>
                <span>{formatINR(invoice.totals.cgst)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-ink-muted)]">SGST</span>
                <span>{formatINR(invoice.totals.sgst)}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between">
              <span className="text-[var(--color-ink-muted)]">IGST</span>
              <span>{formatINR(invoice.totals.igst)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-[var(--color-line-strong)] pt-2 text-base font-bold">
            <span>Grand Total</span>
            <span>{formatINR(invoice.totals.grand_total)}</span>
          </div>
        </div>

        <p className="mt-8 border-t border-[var(--color-line)] pt-4 text-xs text-[var(--color-ink-faint)]">
          GST amounts shown are included in the item prices. This is a
          computer-generated invoice.
        </p>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4 print:hidden">
        <a
          href="javascript:window.print()"
          className="btn-secondary px-4 py-2 text-sm"
        >
          Print / Save as PDF
        </a>
        <div>
          <Link
            href={`/account/orders/${id}`}
            className="text-sm text-[var(--color-accent)] hover:underline"
          >
            ← Order Details
          </Link>
          <span className="mx-2 text-[var(--color-ink-faint)]">·</span>
          <Link
            href="/account"
            className="text-sm text-[var(--color-accent)] hover:underline"
          >
            Account
          </Link>
        </div>
      </div>
    </div>
  )
}
