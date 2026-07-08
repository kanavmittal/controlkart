"use client"

import { useState } from "react"
import type { HttpTypes } from "@medusajs/types"
import { Loader2 } from "lucide-react"
import {
  type CartAddressInput,
  type CustomerAddress,
  customerAddressToCart,
  formatAddressLabel,
} from "@/lib/address-utils"
import { AddressFields } from "@/components/address/address-fields"
import { useAddresses } from "@/lib/hooks/use-addresses"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { useCheckout } from "./use-checkout"

function parseAddr(form: FormData, prefix: "" | "billing_"): CartAddressInput {
  const s = (n: string) => String(form.get(`${prefix}${n}`) ?? "")
  return {
    first_name: s("first_name"),
    last_name: s("last_name"),
    company: s("company") || undefined,
    address_1: s("address_1"),
    address_2: s("address_2") || undefined,
    city: s("city"),
    province: s("province"),
    postal_code: s("postal_code"),
    country_code: "in",
    phone: s("phone"),
  }
}

function addressesDiffer(
  a: { postal_code?: string | null; address_1?: string | null },
  b: { postal_code?: string | null; address_1?: string | null }
) {
  return (
    (a.postal_code || "") !== (b.postal_code || "") ||
    (a.address_1 || "") !== (b.address_1 || "")
  )
}

/**
 * Athens restyle of the delivery/billing address step. Layout, mutation call
 * shapes, and state machine are byte-identical to the pre-restyle version —
 * only the markup changed (native radio inputs are kept for the saved-
 * address picker since there's no shadcn radio-group in this project;
 * `.model-selected` is replaced by the same `border-primary bg-primary/5`
 * selected treatment already established in `quick-view-dialog.tsx`'s
 * variant picker).
 */
export function CheckoutAddressForm({
  savedAddresses,
  cartShipping,
  cartBilling,
  customerDefaults,
  gstin,
  hasAddress,
}: {
  savedAddresses: CustomerAddress[]
  cartShipping?: HttpTypes.StoreCartAddress | null
  cartBilling?: HttpTypes.StoreCartAddress | null
  customerDefaults: {
    first_name?: string | null
    last_name?: string | null
    phone?: string | null
  }
  gstin?: string
  hasAddress: boolean
}) {
  const { setCheckout } = useCheckout()
  const { save } = useAddresses()

  const defaultShipping =
    savedAddresses.find((a) => a.is_default_shipping) ?? savedAddresses[0]

  const initialShippingMode =
    cartShipping || !defaultShipping ? "new" : defaultShipping.id
  const initialBillingDifferent =
    cartBilling && cartShipping
      ? addressesDiffer(cartShipping, cartBilling)
      : false

  const [shippingMode, setShippingMode] = useState<"new" | string>(
    initialShippingMode
  )
  const [billingSame, setBillingSame] = useState(!initialBillingDifferent)
  const [billingMode, setBillingMode] = useState<"new" | string>(() => {
    if (initialBillingDifferent) return "new"
    const defaultBilling =
      savedAddresses.find((a) => a.is_default_billing) ?? savedAddresses[0]
    return defaultBilling?.id ?? "new"
  })

  const useSavedShipping = shippingMode !== "new"
  const useSavedBilling = !billingSame && billingMode !== "new"

  const shippingValues =
    cartShipping ??
    (shippingMode !== "new"
      ? savedAddresses.find((a) => a.id === shippingMode)
      : customerDefaults)

  const billingValues =
    billingMode !== "new"
      ? savedAddresses.find((a) => a.id === billingMode)
      : customerDefaults

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)

    const shipping =
      shippingMode !== "new"
        ? customerAddressToCart(
            savedAddresses.find((a) => a.id === shippingMode)!
          )
        : parseAddr(form, "")
    const billing = billingSame
      ? shipping
      : billingMode !== "new"
        ? customerAddressToCart(savedAddresses.find((a) => a.id === billingMode)!)
        : parseAddr(form, "billing_")

    try {
      await setCheckout.mutateAsync({
        shipping,
        billing,
        gstin: String(form.get("gstin") ?? "") || undefined,
      })

      // Persist new addresses to the customer (non-fatal — cart is already set)
      if (form.get("save_shipping") === "on" && shippingMode === "new") {
        await save
          .mutateAsync({
            body: {
              ...shipping,
              address_name: "Shipping",
              is_default_shipping: !savedAddresses.some(
                (a) => a.is_default_shipping
              ),
              is_default_billing:
                billingSame &&
                !savedAddresses.some((a) => a.is_default_billing),
            },
          })
          .catch(() => {})
      }
      if (
        form.get("save_billing") === "on" &&
        !billingSame &&
        billingMode === "new"
      ) {
        await save
          .mutateAsync({
            body: {
              ...billing,
              address_name: "Billing",
              is_default_billing: !savedAddresses.some(
                (a) => a.is_default_billing
              ),
            },
          })
          .catch(() => {})
      }
    } catch {
      /* surfaced via setCheckout.error */
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
      {savedAddresses.length > 0 && (
        <div className="space-y-2 sm:col-span-2">
          <div className="text-xs font-semibold tracking-wide text-athens-body uppercase">
            Saved delivery addresses
          </div>
          <div className="grid gap-2">
            {savedAddresses.map((addr) => {
              const selected = shippingMode === addr.id
              return (
                <label
                  key={addr.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-[var(--radius)] border px-3 py-2.5 text-sm transition-colors",
                    selected
                      ? "border-primary bg-primary/5"
                      : "border-athens-line hover:border-athens-dark"
                  )}
                >
                  <input
                    type="radio"
                    name="_shipping_pick"
                    checked={selected}
                    onChange={() => setShippingMode(addr.id)}
                    className="mt-1 accent-primary"
                  />
                  <span>
                    <span className="font-medium text-athens-dark">
                      {formatAddressLabel(addr)}
                    </span>
                    {(addr.is_default_shipping || addr.is_default_billing) && (
                      <span className="ml-2 text-xs text-athens-body">
                        {addr.is_default_shipping && "Default shipping"}
                        {addr.is_default_shipping &&
                          addr.is_default_billing &&
                          " · "}
                        {addr.is_default_billing && "Default billing"}
                      </span>
                    )}
                  </span>
                </label>
              )
            })}
            <label
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-[var(--radius)] border px-3 py-2.5 text-sm transition-colors",
                shippingMode === "new"
                  ? "border-primary bg-primary/5"
                  : "border-athens-line hover:border-athens-dark"
              )}
            >
              <input
                type="radio"
                name="_shipping_pick"
                checked={shippingMode === "new"}
                onChange={() => setShippingMode("new")}
                className="accent-primary"
              />
              <span className="font-medium text-athens-dark">
                Use a new address
              </span>
            </label>
          </div>
        </div>
      )}

      {!useSavedShipping && (
        <>
          <AddressFields values={shippingValues ?? undefined} />
          <Field orientation="horizontal" className="sm:col-span-2">
            <Checkbox id="save_shipping" name="save_shipping" defaultChecked />
            <FieldLabel htmlFor="save_shipping" className="font-normal">
              Save this delivery address for future orders
            </FieldLabel>
          </Field>
        </>
      )}

      <div className="border-t border-athens-line pt-4 sm:col-span-2">
        <Field orientation="horizontal">
          <Checkbox
            id="billing_same_as_shipping"
            name="billing_same_as_shipping"
            checked={billingSame}
            onCheckedChange={(checked) => setBillingSame(checked === true)}
          />
          <FieldLabel htmlFor="billing_same_as_shipping">
            Billing address is the same as delivery address
          </FieldLabel>
        </Field>
      </div>

      {!billingSame && (
        <>
          {savedAddresses.length > 0 && (
            <div className="space-y-2 sm:col-span-2">
              <div className="text-xs font-semibold tracking-wide text-athens-body uppercase">
                Billing address
              </div>
              <div className="grid gap-2">
                {savedAddresses.map((addr) => {
                  const selected = billingMode === addr.id
                  return (
                    <label
                      key={addr.id}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-[var(--radius)] border px-3 py-2.5 text-sm transition-colors",
                        selected
                          ? "border-primary bg-primary/5"
                          : "border-athens-line hover:border-athens-dark"
                      )}
                    >
                      <input
                        type="radio"
                        name="_billing_pick"
                        checked={selected}
                        onChange={() => setBillingMode(addr.id)}
                        className="mt-1 accent-primary"
                      />
                      <span className="font-medium text-athens-dark">
                        {formatAddressLabel(addr)}
                      </span>
                    </label>
                  )
                })}
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-[var(--radius)] border px-3 py-2.5 text-sm transition-colors",
                    billingMode === "new"
                      ? "border-primary bg-primary/5"
                      : "border-athens-line hover:border-athens-dark"
                  )}
                >
                  <input
                    type="radio"
                    name="_billing_pick"
                    checked={billingMode === "new"}
                    onChange={() => setBillingMode("new")}
                    className="accent-primary"
                  />
                  <span className="font-medium text-athens-dark">
                    New billing address
                  </span>
                </label>
              </div>
            </div>
          )}

          {!useSavedBilling && (
            <>
              <AddressFields
                prefix="billing_"
                values={billingValues ?? undefined}
              />
              <Field orientation="horizontal" className="sm:col-span-2">
                <Checkbox id="save_billing" name="save_billing" defaultChecked />
                <FieldLabel htmlFor="save_billing" className="font-normal">
                  Save this billing address for future orders
                </FieldLabel>
              </Field>
            </>
          )}
        </>
      )}

      <Field className="sm:col-span-2">
        <FieldLabel htmlFor="gstin">GSTIN</FieldLabel>
        <Input
          id="gstin"
          name="gstin"
          defaultValue={gstin ?? ""}
          placeholder="27AAAAA0000A1Z5"
        />
        <FieldDescription>
          Optional — used to issue a GST invoice for this order.
        </FieldDescription>
      </Field>

      {setCheckout.error && (
        <Alert variant="destructive" className="sm:col-span-2">
          <AlertDescription>
            {setCheckout.error instanceof Error
              ? setCheckout.error.message
              : "Could not save the address. Please check the fields and retry."}
          </AlertDescription>
        </Alert>
      )}

      <div className="sm:col-span-2">
        <Button type="submit" disabled={setCheckout.isPending}>
          {setCheckout.isPending && (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          )}
          {setCheckout.isPending
            ? "Saving…"
            : hasAddress
              ? "Update Address"
              : "Save & Continue"}
        </Button>
      </div>
    </form>
  )
}
