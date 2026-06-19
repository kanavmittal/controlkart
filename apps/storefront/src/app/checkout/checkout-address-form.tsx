"use client"

import { useState } from "react"
import type { HttpTypes } from "@medusajs/types"
import {
  type CartAddressInput,
  type CustomerAddress,
  customerAddressToCart,
  formatAddressLabel,
} from "@/lib/address-utils"
import { AddressFields, inputClass } from "@/components/address/address-fields"
import { useAddresses } from "@/lib/hooks/use-addresses"
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
    <form onSubmit={handleSubmit} className="grid gap-4 p-4 sm:grid-cols-2">
      {savedAddresses.length > 0 && (
        <div className="space-y-2 sm:col-span-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
            Saved delivery addresses
          </div>
          <div className="grid gap-2">
            {savedAddresses.map((addr) => {
              const selected = shippingMode === addr.id
              return (
                <label
                  key={addr.id}
                  className={`flex cursor-pointer items-start gap-3 border px-3 py-2.5 text-sm transition-colors ${
                    selected
                      ? "model-selected"
                      : "border-[var(--color-line)] hover:border-[var(--color-ink-faint)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="_shipping_pick"
                    checked={selected}
                    onChange={() => setShippingMode(addr.id)}
                    className="mt-1"
                  />
                  <span>
                    <span className="font-medium">
                      {formatAddressLabel(addr)}
                    </span>
                    {(addr.is_default_shipping || addr.is_default_billing) && (
                      <span className="ml-2 text-xs text-[var(--color-ink-muted)]">
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
              className={`flex cursor-pointer items-center gap-3 border px-3 py-2.5 text-sm ${
                shippingMode === "new"
                  ? "model-selected"
                  : "border-[var(--color-line)] hover:border-[var(--color-ink-faint)]"
              }`}
            >
              <input
                type="radio"
                name="_shipping_pick"
                checked={shippingMode === "new"}
                onChange={() => setShippingMode("new")}
              />
              <span className="font-medium">Use a new address</span>
            </label>
          </div>
        </div>
      )}

      {!useSavedShipping && (
        <>
          <AddressFields values={shippingValues ?? undefined} />
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="save_shipping" defaultChecked />
            Save this delivery address for future orders
          </label>
        </>
      )}

      <div className="border-t border-[var(--color-line)] pt-4 sm:col-span-2">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            name="billing_same_as_shipping"
            checked={billingSame}
            onChange={(e) => setBillingSame(e.target.checked)}
          />
          Billing address is the same as delivery address
        </label>
      </div>

      {!billingSame && (
        <>
          {savedAddresses.length > 0 && (
            <div className="space-y-2 sm:col-span-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
                Billing address
              </div>
              <div className="grid gap-2">
                {savedAddresses.map((addr) => {
                  const selected = billingMode === addr.id
                  return (
                    <label
                      key={addr.id}
                      className={`flex cursor-pointer items-start gap-3 border px-3 py-2.5 text-sm ${
                        selected
                          ? "model-selected"
                          : "border-[var(--color-line)]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="_billing_pick"
                        checked={selected}
                        onChange={() => setBillingMode(addr.id)}
                        className="mt-1"
                      />
                      <span className="font-medium">
                        {formatAddressLabel(addr)}
                      </span>
                    </label>
                  )
                })}
                <label
                  className={`flex cursor-pointer items-center gap-3 border px-3 py-2.5 text-sm ${
                    billingMode === "new"
                      ? "model-selected"
                      : "border-[var(--color-line)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="_billing_pick"
                    checked={billingMode === "new"}
                    onChange={() => setBillingMode("new")}
                  />
                  <span className="font-medium">New billing address</span>
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
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input type="checkbox" name="save_billing" defaultChecked />
                Save this billing address for future orders
              </label>
            </>
          )}
        </>
      )}

      <label className="grid gap-1 text-sm font-medium sm:col-span-2">
        GSTIN (for GST invoice, optional)
        <input
          name="gstin"
          defaultValue={gstin ?? ""}
          placeholder="27AAAAA0000A1Z5"
          className={inputClass}
        />
      </label>

      {setCheckout.error && (
        <p className="text-sm text-[var(--color-bad)] sm:col-span-2">
          {setCheckout.error instanceof Error
            ? setCheckout.error.message
            : "Could not save the address. Please check the fields and retry."}
        </p>
      )}

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={setCheckout.isPending}
          className="btn-primary px-6 py-2.5"
        >
          {setCheckout.isPending
            ? "Saving…"
            : hasAddress
              ? "Update Address"
              : "Save & Continue"}
        </button>
      </div>
    </form>
  )
}
