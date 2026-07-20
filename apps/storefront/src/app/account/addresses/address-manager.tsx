"use client"

import { useState } from "react"
import { AlertCircle, Loader2, MapPin, Pencil, Trash2 } from "lucide-react"

import { useAddresses, type AddressBody } from "@/lib/hooks/use-addresses"
import type { CustomerAddress } from "@/lib/address-utils"
import { formatAddressLabel } from "@/lib/address-utils"
import { isValidGstin } from "@/lib/gst"
import {
  AddressFields,
  type AddressFieldValues,
} from "@/components/address/address-fields"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

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
    address_1: str("address_1"),
    address_2: str("address_2"),
    city: str("city"),
    province: str("province"),
    postal_code: str("postal_code"),
    country_code: str("country_code") ?? "in",
    phone: str("phone"),
    // GST lives in address metadata; "" when cleared so reads treat it as unset.
    metadata: { gstin: (str("gstin") ?? "").toUpperCase() },
    is_default_shipping: form.get("is_default_shipping") === "on",
    is_default_billing: form.get("is_default_billing") === "on",
  }
}

/** Map a saved address onto the form's field values (GST comes from metadata). */
function toFieldValues(a: CustomerAddress): AddressFieldValues {
  return {
    first_name: a.first_name,
    last_name: a.last_name,
    address_1: a.address_1,
    address_2: a.address_2,
    city: a.city,
    province: a.province,
    postal_code: a.postal_code,
    country_code: a.country_code,
    phone: a.phone,
    gstin: (a.metadata?.gstin as string | undefined) ?? "",
  }
}

/**
 * Athens restyle of the saved-addresses CRUD UI. `useAddresses()` usage
 * (list/save/remove mutations, `AddressBody` shape/`buildAddressBody`) is
 * unchanged. Add/Edit now lives in a shadcn `Dialog` wrapping the same
 * hand-rolled `<form>` + `FormData` submission (no react-hook-form) and the
 * untouched `<AddressFields />` (its own restyle lands separately — this
 * dialog just hosts it). Delete now confirms via `AlertDialog` instead of an
 * inline submit button.
 */
export function AddressManager({
  addresses,
  editing,
  onEditingChange,
}: {
  addresses: CustomerAddress[]
  editing: CustomerAddress | "new" | null
  onEditingChange: (value: CustomerAddress | "new" | null) => void
}) {
  const { save, remove } = useAddresses()
  const [formError, setFormError] = useState<string | null>(null)

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const body = buildAddressBody(form)

    // Country/State/District are custom comboboxes, so enforce "required" here.
    if (!body.country_code || !body.province || !body.city) {
      setFormError("Select a country, state, and district.")
      return
    }
    const gstin = String(form.get("gstin") ?? "").trim()
    if (gstin && !isValidGstin(gstin)) {
      setFormError("Enter a valid GSTIN or leave the GST field blank.")
      return
    }
    setFormError(null)

    const id = editing && editing !== "new" ? editing.id : undefined
    try {
      await save.mutateAsync({ id, body })
      onEditingChange(null)
    } catch {
      /* surfaced via save.error below */
    }
  }

  return (
    <div className="space-y-8">
      {addresses.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {addresses.map((addr) => (
            <AddressCard
              key={addr.id}
              address={addr}
              onEdit={() => onEditingChange(addr)}
              remove={remove}
            />
          ))}
        </div>
      ) : (
        <Empty className="border border-dashed border-athens-line">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MapPin aria-hidden />
            </EmptyMedia>
            <EmptyTitle>No saved addresses</EmptyTitle>
            <EmptyDescription>
              Add a delivery or billing address to speed up checkout.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button type="button" onClick={() => onEditingChange("new")}>
              Add address
            </Button>
          </EmptyContent>
        </Empty>
      )}

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) {
            setFormError(null)
            onEditingChange(null)
          }
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <form onSubmit={handleSave} className="contents">
            <DialogHeader>
              <DialogTitle>
                {editing === "new" ? "Add address" : "Edit address"}
              </DialogTitle>
            </DialogHeader>

            {(formError || save.error) && (
              <Alert variant="destructive">
                <AlertCircle aria-hidden />
                <AlertTitle>Couldn&apos;t save address</AlertTitle>
                <AlertDescription>
                  {formError ?? errorMessageOf(save.error)}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="address_name">
                  Label (e.g. Office, Warehouse)
                </FieldLabel>
                <Input
                  id="address_name"
                  name="address_name"
                  defaultValue={
                    editing === "new" || !editing
                      ? ""
                      : (editing.address_name ?? "")
                  }
                  placeholder="Home"
                />
              </Field>

              <AddressFields
                key={editing === "new" || !editing ? "new" : editing.id}
                showGst
                values={
                  editing === "new" || !editing
                    ? undefined
                    : toFieldValues(editing)
                }
              />

              <Field orientation="horizontal" className="sm:col-span-2">
                <Checkbox
                  id="is_default_shipping"
                  name="is_default_shipping"
                  defaultChecked={
                    !!editing &&
                    editing !== "new" &&
                    editing.is_default_shipping
                  }
                />
                <FieldLabel
                  htmlFor="is_default_shipping"
                  className="font-normal"
                >
                  Default shipping address
                </FieldLabel>
              </Field>
              <Field orientation="horizontal" className="sm:col-span-2">
                <Checkbox
                  id="is_default_billing"
                  name="is_default_billing"
                  defaultChecked={
                    !!editing &&
                    editing !== "new" &&
                    editing.is_default_billing
                  }
                />
                <FieldLabel
                  htmlFor="is_default_billing"
                  className="font-normal"
                >
                  Default billing address
                </FieldLabel>
              </Field>
            </div>

            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cancel
              </DialogClose>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Saving…
                  </>
                ) : (
                  "Save address"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AddressCard({
  address,
  onEdit,
  remove,
}: {
  address: CustomerAddress
  onEdit: () => void
  remove: ReturnType<typeof useAddresses>["remove"]
}) {
  const isDeleting = remove.isPending && remove.variables === address.id
  const deleteFailed = !!remove.error && remove.variables === address.id

  async function handleDelete() {
    try {
      await remove.mutateAsync(address.id)
    } catch {
      /* surfaced via deleteFailed below; AlertDialog stays open */
    }
  }

  return (
    <Card className="border-athens-line">
      <CardHeader className="gap-1.5">
        <CardTitle className="text-sm">
          {formatAddressLabel(address)}
        </CardTitle>
        {(address.is_default_shipping || address.is_default_billing) && (
          <div className="flex flex-wrap gap-1.5">
            {address.is_default_shipping && (
              <Badge className="border-transparent bg-athens-success-bg text-athens-success">
                Default shipping
              </Badge>
            )}
            {address.is_default_billing && (
              <Badge className="border-transparent bg-athens-band text-athens-blue">
                Default billing
              </Badge>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-1 text-sm text-athens-body">
        <p>{address.address_1}</p>
        {address.address_2 && <p>{address.address_2}</p>}
        <p>
          {[address.city, address.province, address.postal_code]
            .filter(Boolean)
            .join(", ")}
        </p>
        {address.phone && <p>{address.phone}</p>}
      </CardContent>
      <CardFooter className="gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onEdit}>
          <Pencil aria-hidden />
          Edit
        </Button>

        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-destructive hover:border-destructive"
              />
            }
          >
            <Trash2 aria-hidden />
            Delete
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this address?</AlertDialogTitle>
              <AlertDialogDescription>
                {formatAddressLabel(address)} will be permanently removed.
                This can&apos;t be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {deleteFailed && (
              <Alert variant="destructive">
                <AlertCircle aria-hidden />
                <AlertDescription>
                  {errorMessageOf(remove.error)}
                </AlertDescription>
              </Alert>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                render={
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  />
                }
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Deleting…
                  </>
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  )
}
