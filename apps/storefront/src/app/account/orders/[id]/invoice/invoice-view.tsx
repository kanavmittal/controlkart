"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Printer } from "lucide-react"
import { sdk } from "@/lib/sdk"
import { queryKeys } from "@/lib/query-keys"
import { useCustomer } from "@/lib/hooks/use-customer"
import { formatINR, formatDate } from "@/lib/format"
import { Breadcrumbs } from "@/components/shared/breadcrumbs"
import { Button } from "@/components/ui/button"

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

// Home -> Account -> Order -> Invoice. Kept generic ("Order", not "Order
// #NNN") so it renders identically before/after the invoice query resolves.
function invoiceCrumbs(orderId: string) {
  return [
    { label: "Account", href: "/account" },
    { label: "Order", href: `/account/orders/${orderId}` },
    { label: "Invoice" },
  ]
}

export function InvoiceView() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const router = useRouter()
  const { customer, isLoading: customerLoading } = useCustomer()

  useEffect(() => {
    if (!customerLoading && !customer) {
      router.replace(`/account?redirect=/account/orders/${id}/invoice`)
    }
  }, [customer, customerLoading, router, id])

  const {
    data: invoice,
    isLoading,
    isError,
  } = useQuery({
    queryKey: [...queryKeys.order(id), "invoice"],
    enabled: !!id && !!customer,
    retry: false,
    queryFn: async () => {
      const { invoice } = await sdk.client.fetch<{ invoice: Invoice }>(
        `/store/orders/${id}/invoice`
      )
      return invoice
    },
  })

  if (customerLoading || !customer || isLoading) {
    return (
      <>
        <Breadcrumbs className="print:hidden" crumbs={invoiceCrumbs(id)} />
        <div className="athens-container py-20 text-center text-sm text-athens-body">
          Loading invoice…
        </div>
      </>
    )
  }

  if (isError || !invoice) {
    return (
      <>
        <Breadcrumbs className="print:hidden" crumbs={invoiceCrumbs(id)} />
        <div className="athens-container py-20 text-center">
          <h1 className="text-2xl font-bold">Invoice not available</h1>
          <p className="mt-2 text-sm text-athens-body">
            We couldn’t load that invoice.
          </p>
          <div className="mt-6">
            <Button render={<Link href="/account" />}>Back to Account</Button>
          </div>
        </div>
      </>
    )
  }

  const addr = invoice.buyer.billing_address

  return (
    <>
      <Breadcrumbs className="print:hidden" crumbs={invoiceCrumbs(id)} />
      <div className="athens-container max-w-4xl py-12 print:py-0">
        <div className="border border-athens-line p-8">
          <header className="flex items-start justify-between border-b border-athens-line pb-6">
            <div>
              <h1 className="text-xl font-bold">TAX INVOICE</h1>
              <p className="mt-1 font-mono text-sm">{invoice.invoice_number}</p>
              <p className="text-xs text-athens-body">
                {formatDate(invoice.date)}
              </p>
            </div>
            <div className="text-right text-sm">
              <div className="font-bold">{invoice.seller.name}</div>
              <div className="text-athens-body">
                State: {invoice.seller.state}
              </div>
              {invoice.seller.gstin && (
                <div className="font-mono text-xs">
                  GSTIN: {invoice.seller.gstin}
                </div>
              )}
            </div>
          </header>

          <section className="grid grid-cols-2 gap-8 border-b border-athens-line py-6 text-sm">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-athens-body">
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
                <h2 className="text-xs font-semibold uppercase tracking-wide text-athens-body">
                  Buyer GSTIN
                </h2>
                <div className="mt-2 font-mono">{invoice.buyer.gstin}</div>
              </div>
            )}
          </section>

          <table className="mt-6 w-full text-sm">
            <thead>
              <tr className="border-b border-athens-dark text-left text-xs uppercase tracking-wide text-athens-body">
                <th className="py-2">Item</th>
                <th className="py-2">HSN</th>
                <th className="py-2 text-right">Qty</th>
                <th className="py-2 text-right">Rate</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, i) => (
                <tr key={i} className="border-b border-athens-line">
                  <td className="py-2">
                    {item.title}
                    <div className="font-mono text-xs text-athens-body">
                      {item.sku}
                    </div>
                  </td>
                  <td className="py-2 font-mono text-xs">{item.hsn_code}</td>
                  <td className="py-2 text-right">{item.quantity}</td>
                  <td className="py-2 text-right">
                    {formatINR(item.unit_price)}
                  </td>
                  <td className="py-2 text-right">{formatINR(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-6 ml-auto w-72 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-athens-body">Taxable + Tax</span>
              <span>{formatINR(invoice.totals.item_total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-athens-body">Shipping</span>
              <span>{formatINR(invoice.totals.shipping_total)}</span>
            </div>
            {invoice.totals.type === "intra_state" ? (
              <>
                <div className="flex justify-between">
                  <span className="text-athens-body">CGST</span>
                  <span>{formatINR(invoice.totals.cgst)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-athens-body">SGST</span>
                  <span>{formatINR(invoice.totals.sgst)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between">
                <span className="text-athens-body">IGST</span>
                <span>{formatINR(invoice.totals.igst)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-athens-dark pt-2 text-base font-bold">
              <span>Grand Total</span>
              <span>{formatINR(invoice.totals.grand_total)}</span>
            </div>
          </div>

          <p className="mt-8 border-t border-athens-line pt-4 text-xs text-athens-body">
            GST amounts shown are included in the item prices. This is a
            computer-generated invoice.
          </p>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4 print:hidden">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => window.print()}
          >
            <Printer aria-hidden />
            Print / Save as PDF
          </Button>
          <div>
            <Link
              href={`/account/orders/${id}`}
              className="text-sm text-athens-blue hover:underline"
            >
              ← Order Details
            </Link>
            <span className="mx-2 text-athens-body">·</span>
            <Link
              href="/account"
              className="text-sm text-athens-blue hover:underline"
            >
              Account
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
