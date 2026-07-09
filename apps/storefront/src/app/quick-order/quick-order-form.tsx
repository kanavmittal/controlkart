"use client"

import { useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { CircleCheck, CircleX, ListChecks, Loader2 } from "lucide-react"

import { sdk, PRODUCT_FIELDS_CLIENT } from "@/lib/sdk"
import { useCart } from "@/lib/hooks/use-cart"
import { useRegion } from "@/lib/hooks/use-region"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Price } from "@/components/shared/price"

// The `/store/quick-order` endpoint (apps/medusa/src/api/store/quick-order/route.ts)
// actually returns the resolved product on each variant (title/handle/thumbnail) even
// though this type used to only declare id/sku/title — widened here to display the
// product column; the endpoint itself is untouched.
type LookupResult = {
  sku: string
  found: boolean
  variant: {
    id: string
    sku: string
    title: string
    product: { id: string; title: string; handle: string } | null
  } | null
}

type ParsedLine = { sku: string; quantity: number }

export function QuickOrderForm() {
  const router = useRouter()
  const { addItem } = useCart()
  const { regionId } = useRegion()
  const searchParams = useSearchParams()

  // NEW: `?sku=` prefills the textarea with that SKU at qty 1 (e.g. from search
  // typeahead's "Quick order ->" row, or a shared link). Read once on mount —
  // the textarea stays uncontrolled afterwards, same as before.
  const [initialItems] = useState(() => {
    const sku = searchParams.get("sku")
    return sku ? `${sku.toUpperCase()}, 1` : ""
  })

  const [error, setError] = useState<string | null>(null)
  const [lookupPending, setLookupPending] = useState(false)
  const [addPending, setAddPending] = useState(false)
  const [lines, setLines] = useState<ParsedLine[]>([])
  const [results, setResults] = useState<LookupResult[] | null>(null)

  const allFound = results !== null && results.length > 0 && results.every((r) => r.found)

  async function handleLookup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setResults(null)

    const form = new FormData(e.currentTarget)
    const parsed = String(form.get("items") ?? "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const [sku, qty] = line.split(/[,\s]+/)
        return {
          sku: sku?.toUpperCase(),
          quantity: Math.max(1, Number(qty) || 1),
        }
      })
      .filter((i) => i.sku)

    if (!parsed.length) {
      setError("Enter at least one line, e.g. MIBRX-6M-1-1-1-230V, 5")
      return
    }

    setLookupPending(true)
    try {
      const { results } = await sdk.client.fetch<{ results: LookupResult[] }>(
        "/store/quick-order",
        { query: { skus: parsed.map((l) => l.sku).join(",") } }
      )

      const missing = results.filter((r) => !r.found).map((r) => r.sku)
      if (missing.length) {
        setError(
          `SKU${missing.length > 1 ? "s" : ""} not found: ${missing.join(", ")}. Check the model codes and try again.`
        )
      }

      setLines(parsed)
      setResults(results)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not look up the SKUs. Please retry."
      )
    } finally {
      setLookupPending(false)
    }
  }

  function updateQuantity(sku: string, quantity: number) {
    setLines((prev) =>
      prev.map((l) => (l.sku === sku ? { ...l, quantity: Math.max(1, quantity || 1) } : l))
    )
  }

  async function handleAddAll() {
    if (!results || !allFound) return

    setError(null)
    setAddPending(true)
    try {
      // Add sequentially so the first line creates the cart and the rest reuse
      // it (getOrCreateCartId resolves against localStorage, not React state).
      for (const line of lines) {
        const match = results.find((r) => r.sku === line.sku)
        if (match?.variant) {
          await addItem.mutateAsync({
            variantId: match.variant.id,
            quantity: line.quantity,
          })
        }
      }

      router.push("/cart")
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not add the items to your cart. Please retry."
      )
      setAddPending(false)
    }
  }

  // Supplemental display-only price lookup: the quick-order endpoint above
  // resolves variants but never returns price, so unit price is fetched
  // separately (same SDK + fields used by the home featured grid) for the
  // products found. This never touches the preserved lookup/add contracts.
  const productIds = useMemo(() => {
    if (!results) return []
    const ids = results
      .filter((r) => r.found && r.variant?.product?.id)
      .map((r) => r.variant!.product!.id)
    return Array.from(new Set(ids))
  }, [results])

  const { data: priceByVariant = {} } = useQuery({
    queryKey: ["quick-order-prices", productIds, regionId],
    enabled: productIds.length > 0 && !!regionId,
    queryFn: async () => {
      const { products } = await sdk.store.product.list({
        id: productIds,
        region_id: regionId,
        fields: PRODUCT_FIELDS_CLIENT,
        limit: productIds.length,
      })
      const map: Record<string, number | null> = {}
      for (const product of products) {
        for (const variant of product.variants ?? []) {
          map[variant.id] = variant.calculated_price?.calculated_amount ?? null
        }
      }
      return map
    },
  })

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Enter SKUs</CardTitle>
          <CardDescription>
            One SKU per line, comma or space separated from the quantity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLookup} className="grid gap-4">
            <Textarea
              name="items"
              rows={8}
              required
              defaultValue={initialItems}
              placeholder={"SKU, quantity\nMIBRX-6M-1-1-1-230V, 5"}
              className="font-mono text-sm"
            />
            <p className="text-sm text-athens-body">
              Paste directly from a spreadsheet — we&apos;ll split on commas or
              whitespace and default missing quantities to 1.
            </p>
            {error && (
              <Alert variant="destructive">
                <CircleX />
                <AlertTitle>Some SKUs need attention</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div>
              <Button type="submit" disabled={lookupPending}>
                {lookupPending && (
                  <Loader2 className="animate-spin" data-icon="inline-start" />
                )}
                {lookupPending ? "Looking up…" : "Look up SKUs"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
          <CardDescription>
            Review matches and quantities before adding everything to your cart.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!results ? (
            <Empty className="border border-dashed border-athens-line">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ListChecks />
                </EmptyMedia>
                <EmptyTitle>No SKUs looked up yet</EmptyTitle>
                <EmptyDescription>
                  Enter your SKUs above and click &quot;Look up SKUs&quot; to see
                  product matches here.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="grid gap-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Variant</TableHead>
                    <TableHead>Unit price</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result) => {
                    const line = lines.find((l) => l.sku === result.sku)
                    const unitPrice = result.variant
                      ? priceByVariant[result.variant.id]
                      : null
                    return (
                      <TableRow key={result.sku}>
                        <TableCell className="font-mono">{result.sku}</TableCell>
                        <TableCell>
                          {result.variant?.product?.title ?? (
                            <span className="text-athens-body">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {result.variant?.title ?? (
                            <span className="text-athens-body">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Price amount={unitPrice} />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            className="w-20"
                            value={line?.quantity ?? 1}
                            disabled={!result.found || addPending}
                            onChange={(e) =>
                              updateQuantity(result.sku, Number(e.target.value))
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          {result.found ? (
                            <span className="inline-flex items-center gap-1.5 text-athens-success">
                              <CircleCheck className="size-4" />
                              Found
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-destructive">
                              <CircleX className="size-4" />
                              Not found
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              <div>
                <Button
                  variant="secondary"
                  disabled={!allFound || addPending}
                  onClick={handleAddAll}
                >
                  {addPending && (
                    <Loader2 className="animate-spin" data-icon="inline-start" />
                  )}
                  {addPending ? "Adding to cart…" : "Add all to cart"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
