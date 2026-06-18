"use client"

import { useActionState, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  saveCustomerAddress,
  deleteCustomerAddressAction,
} from "@/lib/data/addresses"
import type { CustomerAddress } from "@/lib/address-utils"
import { formatAddressLabel } from "@/lib/address-utils"
import { AddressFields, inputClass } from "@/components/address/address-fields"

export function AddressManager({
  addresses: initial,
}: {
  addresses: CustomerAddress[]
}) {
  const [editing, setEditing] = useState<CustomerAddress | "new" | null>(null)
  const router = useRouter()
  const [saveState, saveAction, savePending] = useActionState(
    saveCustomerAddress,
    undefined
  )
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteCustomerAddressAction,
    undefined
  )

  useEffect(() => {
    if (saveState?.success) {
      setEditing(null)
      router.refresh()
    }
  }, [saveState?.success, router])

  useEffect(() => {
    if (deleteState?.success) router.refresh()
  }, [deleteState?.success, router])

  return (
    <div className="space-y-8">
      {saveState?.error && (
        <p className="text-sm text-[var(--color-bad)]">{saveState.error}</p>
      )}

      {initial.length > 0 && (
        <div className="border border-[var(--color-line)]">
          {initial.map((addr) => (
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
                <form action={deleteAction}>
                  <input type="hidden" name="id" value={addr.id} />
                  <button
                    type="submit"
                    disabled={deletePending}
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
            action={saveAction}
            className="mt-4 grid gap-4 sm:grid-cols-2"
          >
            {editing !== "new" && (
              <input type="hidden" name="id" value={editing.id} />
            )}
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
                disabled={savePending}
                className="btn-primary px-4 py-2"
              >
                {savePending ? "Saving…" : "Save address"}
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
