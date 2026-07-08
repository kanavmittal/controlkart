"use client"

import { useActionState } from "react"
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react"

import { submitQuoteRequest } from "@/lib/data/quotes"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"

function RequiredMark() {
  return (
    <span aria-hidden="true" className="text-destructive">
      *
    </span>
  )
}

export function QuoteForm({ initialSku }: { initialSku?: string }) {
  const [state, action, pending] = useActionState(submitQuoteRequest, undefined)

  // Success state — guest quotes are allowed (no auth required); message
  // kept semantically identical to the original.
  if (state?.success) {
    return (
      <Card className="border-[var(--color-athens-success)]/30 bg-[var(--color-athens-success-bg)]">
        <CardContent className="flex items-start gap-3">
          <CheckCircle2
            className="mt-0.5 size-6 shrink-0 text-[var(--color-athens-success)]"
            aria-hidden
          />
          <div>
            <h2 className="text-base font-medium text-[var(--color-athens-success)]">
              Quote request received
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-athens-body)]">
              Our team will get back to you within one working day with pricing and
              availability.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Quote details</CardTitle>
        <CardDescription>
          Fields marked <span className="text-destructive">*</span> are required.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action}>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="company_name">
                  Company name <RequiredMark />
                </FieldLabel>
                <Input id="company_name" name="company_name" required />
              </Field>

              <Field>
                <FieldLabel htmlFor="gstin">GSTIN</FieldLabel>
                <Input id="gstin" name="gstin" placeholder="27AAAAA0000A1Z5" />
                <FieldDescription>
                  Optional — only needed if you require a GST invoice.
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="contact_name">
                  Contact name <RequiredMark />
                </FieldLabel>
                <Input id="contact_name" name="contact_name" required />
              </Field>

              <Field>
                <FieldLabel htmlFor="email">
                  Email <RequiredMark />
                </FieldLabel>
                <Input id="email" type="email" name="email" required />
              </Field>

              <Field>
                <FieldLabel htmlFor="phone">
                  Phone <RequiredMark />
                </FieldLabel>
                <Input id="phone" type="tel" name="phone" required />
              </Field>

              <Field>
                <FieldLabel htmlFor="pincode">
                  Delivery pincode <RequiredMark />
                </FieldLabel>
                <Input
                  id="pincode"
                  name="pincode"
                  required
                  pattern="[0-9]{6}"
                  inputMode="numeric"
                  placeholder="400001"
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="items">
                Items <RequiredMark />
              </FieldLabel>
              <Textarea
                id="items"
                name="items"
                rows={5}
                required
                defaultValue={initialSku ? `${initialSku}, 10` : ""}
                placeholder={"MIBRX-6M-1-1-1-230V, 25\nMIBRX-DSP-6M-8-2-08-A, 25"}
                className="font-mono"
              />
              <FieldDescription>
                One item per line, format <code className="font-mono">SKU, quantity</code>.
              </FieldDescription>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="expected_date">Expected purchase date</FieldLabel>
                <Input id="expected_date" type="date" name="expected_date" />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="notes">Notes</FieldLabel>
              <Textarea id="notes" name="notes" rows={3} />
            </Field>

            {state?.error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-[var(--radius)] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>{state.error}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={pending}
              data-icon={pending ? "inline-start" : undefined}
              className="w-full sm:w-auto"
            >
              {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {pending ? "Submitting…" : "Submit quote request"}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
