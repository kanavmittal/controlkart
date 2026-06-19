"use client"

import { useState } from "react"
import { useAddresses, type AddressBody } from "@/lib/hooks/use-addresses"
import type { CustomerAddress } from "@/lib/address-utils"
import { formatAddressLabel } from "@/lib/address-utils"
import { AddressFields, inputClass } from "@/components/address/address-fields"

function errorMessageOf(error: unknown): string {
  if (error instanceof Error) return error.message
  return "Could not save the address. Please try again."
}

function buildAddressBody(form: FormData): AddressBody {
  const str = (name: string) => {
    const value = form.get(name)
    return typeof value === "string" && value.length > 0 ? value : undefined
  }
  return {
    address_name: str("address_name"),
    first_name: str("first_name"),
    last_name: str("last_name"),
    company: str("company"),
    address_1: str("address_1"),
    address_2: str("address_2"),
    city: str("city"),
    province: str("province"),
    postal_code: str("postal_code"),
    country_code: "in",
    phone: str("phone"),
    is_default_shipping: form.get("is_default_shipping") === "on",
    is_default_billing: form.get("is_default_billing") === "on",
  }
}

export function AddressManager({
  addresses,
}: {
  addresses: CustomerAddress[]
}) {
  const [editing, setEditing] = useState<CustomerAddress | "new" | null>(null)
  const { save, remove } = useAddresses()

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const id = editing && editing !== "new" ? editing.id : undefined
    try {
      await save.mutateAsync({ id, body: buildAddressBody(form) })
      setEditing(null)
    } catch {
      /* surfaced via save.error */
    }
  }

  return (
    <div className="space-y-8">
      {save.error && (
        <p className="text-sm text-[var(--color-bad)]">
          {errorMessageOf(save.error)}
        </p>
      )}

      {addresses.length > 0 && (
        <div className="border border-[var(--color-line)]">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--color-line)] px-4 py-4 last:border-b-0"
            >
              <div className="text-sm">
                <div className="font-medium">{formatAddressLabel(addr)}</div>
                <div className="mt-1 text-xs text-[var(--color-ink-muted)]">
                  {addr.phone}
                  {addr.is_default_shipping && " · Default shipping"}
                  {addr.is_default_billing && " · Default billing"}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(addr)}
                  className="btn-secondary px-3 py-1.5 text-xs"
                >
                  Edit
                </button>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    remove.mutate(addr.id)
                  }}
                >
                  <button
                    type="submit"
                    disabled={remove.isPending}
                    className="border border-[var(--color-line)] px-3 py-1.5 text-xs text-[var(--color-bad)] hover:bg-[var(--color-surface-alt)] disabled:opacity-40"
                  >
                    Delete
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing ? (
        <div className="border border-[var(--color-line)] p-4">
          <h3 className="text-sm font-semibold">
            {editing === "new" ? "Add address" : "Edit address"}
          </h3>
          <form
            onSubmit={handleSave}
            className="mt-4 grid gap-4 sm:grid-cols-2"
          >
            <label className="grid gap-1 text-sm font-medium sm:col-span-2">
              Label (e.g. Office, Warehouse)
              <input
                name="address_name"
                defaultValue={
                  editing === "new" ? "" : (editing.address_name ?? "")
                }
                placeholder="Home"
                className={inputClass}
              />
            </label>
            <AddressFields
              values={editing === "new" ? undefined : editing}
            />
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                name="is_default_shipping"
                defaultChecked={
                  editing !== "new" && editing.is_default_shipping
                }
              />
              Default shipping address
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                name="is_default_billing"
                defaultChecked={editing !== "new" && editing.is_default_billing}
              />
              Default billing address
            </label>
            <div className="flex gap-2 sm:col-span-2">
              <button
                type="submit"
                disabled={save.isPending}
                className="btn-primary px-4 py-2"
              >
                {save.isPending ? "Saving…" : "Save address"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="btn-secondary px-4 py-2"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="btn-primary px-4 py-2.5"
        >
          Add new address
        </button>
      )}
    </div>
  )
}
