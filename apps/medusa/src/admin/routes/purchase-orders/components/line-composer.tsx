import { Button, Input, Text } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { adminFetch } from "../../../lib/client"

export type VariantOption = {
  id: string
  sku: string
  title: string
}

type RawVariant = {
  id: string
  sku: string | null
  title: string
  product?: { title?: string | null } | null
}

/**
 * Debounced variant search (by SKU or title) against the standard admin
 * products/variants API, followed by a quantity step. Callers decide what
 * "adding" a line means (append to local draft state, or POST to the
 * lines endpoint) via `onAdd`.
 */
export function LineComposer({
  onAdd,
  disabledVariantIds = [],
  submitting = false,
}: {
  onAdd: (variant: VariantOption, quantity: number) => void
  disabledVariantIds?: string[]
  submitting?: boolean
}) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<VariantOption[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<VariantOption | null>(null)
  const [quantity, setQuantity] = useState("1")

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }
    setSearching(true)
    const timer = setTimeout(async () => {
      try {
        const res = await adminFetch<{ variants: RawVariant[] }>(
          `/admin/product-variants?q=${encodeURIComponent(
            query.trim()
          )}&limit=10&fields=id,title,sku,product.title`
        )
        setResults(
          res.variants.map((v) => ({
            id: v.id,
            sku: v.sku ?? "—",
            title: v.product?.title ? `${v.product.title} — ${v.title}` : v.title,
          }))
        )
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const confirmAdd = () => {
    const qty = parseInt(quantity, 10)
    if (!selected || !Number.isFinite(qty) || qty <= 0) return
    onAdd(selected, qty)
    setSelected(null)
    setQuantity("1")
    setQuery("")
    setResults([])
  }

  if (selected) {
    return (
      <div className="bg-ui-bg-subtle flex items-center justify-between gap-x-3 rounded-md p-3">
        <div className="flex min-w-0 flex-col">
          <Text size="small" weight="plus" leading="compact">
            {selected.sku}
          </Text>
          <Text
            size="small"
            leading="compact"
            className="text-ui-fg-subtle truncate"
          >
            {selected.title}
          </Text>
        </div>
        <div className="flex shrink-0 items-center gap-x-2">
          <Input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-20"
          />
          <Button
            size="small"
            variant="secondary"
            disabled={submitting}
            onClick={() => setSelected(null)}
          >
            Cancel
          </Button>
          <Button size="small" onClick={confirmAdd} isLoading={submitting}>
            Add line
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-y-2">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search variants by SKU or product title"
      />
      {searching && (
        <Text size="small" className="text-ui-fg-subtle">
          Searching…
        </Text>
      )}
      {!searching && query.trim() && !results.length && (
        <Text size="small" className="text-ui-fg-subtle">
          No matching variants
        </Text>
      )}
      {!!results.length && (
        <div className="border-ui-border-base flex flex-col gap-y-1 rounded-md border p-2">
          {results.map((v) => {
            const disabled = disabledVariantIds.includes(v.id)
            return (
              <div
                key={v.id}
                className="hover:bg-ui-bg-subtle flex items-center justify-between gap-x-2 rounded-md px-2 py-1"
              >
                <div className="flex min-w-0 flex-col">
                  <Text size="small" weight="plus" leading="compact">
                    {v.sku}
                  </Text>
                  <Text
                    size="small"
                    leading="compact"
                    className="text-ui-fg-subtle truncate"
                  >
                    {v.title}
                  </Text>
                </div>
                <Button
                  size="small"
                  variant="secondary"
                  disabled={disabled}
                  onClick={() => setSelected(v)}
                >
                  {disabled ? "Added" : "Select"}
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
