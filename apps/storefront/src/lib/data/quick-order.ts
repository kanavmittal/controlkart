"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { quickOrderLookup } from "./products"
import { addToCart } from "./cart"

export async function quickOrderToCart(
  _prev: { error?: string } | undefined,
  formData: FormData
) {
  const lines = ((formData.get("items") as string) || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [sku, qty] = line.split(/[,\s]+/)
      return { sku: sku?.toUpperCase(), quantity: Math.max(1, Number(qty) || 1) }
    })
    .filter((i) => i.sku)

  if (!lines.length) {
    return { error: "Enter at least one line, e.g. MIBRX-6M-1-1-1-230V, 5" }
  }

  const { results } = await quickOrderLookup(lines.map((l) => l.sku))
  const missing = results.filter((r) => !r.found).map((r) => r.sku)
  if (missing.length) {
    return {
      error: `SKU${missing.length > 1 ? "s" : ""} not found: ${missing.join(", ")}. Check the model codes and try again.`,
    }
  }

  for (const line of lines) {
    const match = results.find((r) => r.sku === line.sku)
    if (match?.variant) {
      await addToCart(match.variant.id, line.quantity)
    }
  }

  revalidatePath("/cart")
  redirect("/cart")
}
