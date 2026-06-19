"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { sdk } from "@/lib/sdk"
import { useCart } from "@/lib/hooks/use-cart"

type LookupResult = {
  sku: string
  found: boolean
  variant: { id: string; sku: string; title: string } | null
}

export function QuickOrderForm() {
  const router = useRouter()
  const { addItem } = useCart()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const form = new FormData(e.currentTarget)
    const lines = String(form.get("items") ?? "")
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

    if (!lines.length) {
      setError("Enter at least one line, e.g. MIBRX-6M-1-1-1-230V, 5")
      return
    }

    setPending(true)
    try {
      const { results } = await sdk.client.fetch<{ results: LookupResult[] }>(
        "/store/quick-order",
        { query: { skus: lines.map((l) => l.sku).join(",") } }
      )

      const missing = results.filter((r) => !r.found).map((r) => r.sku)
      if (missing.length) {
        setError(
          `SKU${missing.length > 1 ? "s" : ""} not found: ${missing.join(", ")}. Check the model codes and try again.`
        )
        setPending(false)
        return
      }

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
      setPending(false)
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <textarea
        name="items"
        rows={8}
        required
        placeholder={"SKU, quantity\nMIBRX-6M-1-1-1-230V, 5"}
        className="w-full border border-[var(--color-line)] p-3 font-mono text-sm outline-none focus:border-[var(--color-line-strong)]"
      />
      {error && <p className="mt-2 text-sm text-[var(--color-bad)]">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="btn-primary mt-4 px-6 py-2.5"
      >
        {pending ? "Adding…" : "Add All to Cart"}
      </button>
    </form>
  )
}
