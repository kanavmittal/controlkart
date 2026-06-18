"use client"

import { useActionState } from "react"
import { submitQuoteRequest } from "@/lib/data/quotes"

const inputClass =
  "w-full border border-[var(--color-line)] px-3 py-2 text-sm outline-none focus:border-[var(--color-line-strong)]"

export function QuoteForm({ initialSku }: { initialSku?: string }) {
  const [state, action, pending] = useActionState(submitQuoteRequest, undefined)

  if (state?.success) {
    return (
      <div className="border border-[var(--color-ok)] bg-[var(--color-surface-alt)] p-6">
        <h2 className="text-base font-semibold text-[var(--color-ok)]">
          Quote request received
        </h2>
        <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
          Our team will get back to you within one working day with pricing
          and availability.
        </p>
      </div>
    )
  }

  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium">
          Company Name *
          <input name="company_name" required className={inputClass} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          GSTIN (optional)
          <input
            name="gstin"
            className={inputClass}
            placeholder="27AAAAA0000A1Z5"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Contact Name *
          <input name="contact_name" required className={inputClass} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Email *
          <input type="email" name="email" required className={inputClass} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Phone *
          <input type="tel" name="phone" required className={inputClass} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Delivery Pincode *
          <input
            name="pincode"
            required
            pattern="[0-9]{6}"
            className={inputClass}
          />
        </label>
      </div>
      <label className="grid gap-1 text-sm font-medium">
        Items (one per line: SKU, quantity) *
        <textarea
          name="items"
          rows={5}
          required
          defaultValue={initialSku ? `${initialSku}, 10` : ""}
          placeholder={"MIBRX-6M-1-1-1-230V, 25\nMIBRX-DSP-6M-8-2-08-A, 25"}
          className={`${inputClass} font-mono`}
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium">
          Expected Purchase Date
          <input type="date" name="expected_date" className={inputClass} />
        </label>
      </div>
      <label className="grid gap-1 text-sm font-medium">
        Notes
        <textarea name="notes" rows={3} className={inputClass} />
      </label>
      {state?.error && (
        <p className="text-sm text-[var(--color-bad)]">{state.error}</p>
      )}
      <button type="submit" disabled={pending} className="btn-primary px-6 py-2.5">
        {pending ? "Submitting…" : "Submit Quote Request"}
      </button>
    </form>
  )
}
