"use server"

import { storeFetch } from "../medusa"
import { authHeaders } from "./cookies"

export async function submitQuoteRequest(
  _prev: { error?: string; success?: boolean } | undefined,
  formData: FormData
) {
  const rawItems = (formData.get("items") as string) || ""
  const items = rawItems
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [sku, qty] = line.split(/[,\s]+/)
      return { sku: sku?.toUpperCase(), quantity: Math.max(1, Number(qty) || 1) }
    })
    .filter((i) => i.sku)

  if (!items.length) {
    return { error: "Add at least one SKU line, e.g. MIBRX-6M-1-1-1-230V, 10" }
  }

  try {
    await storeFetch("/store/quotes", {
      method: "POST",
      headers: await authHeaders(),
      body: {
        company_name: formData.get("company_name"),
        gstin: formData.get("gstin") || undefined,
        contact_name: formData.get("contact_name"),
        email: formData.get("email"),
        phone: formData.get("phone"),
        pincode: formData.get("pincode"),
        expected_date: formData.get("expected_date") || undefined,
        notes: formData.get("notes") || undefined,
        items,
      },
    })
    return { success: true }
  } catch {
    return { error: "Failed to submit quote request. Please try again." }
  }
}
