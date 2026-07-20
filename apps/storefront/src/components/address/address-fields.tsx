"use client"

import { useMemo, useState } from "react"
import { CheckCircle2 } from "lucide-react"

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Combobox, type ComboboxOption } from "@/components/ui/combobox"
import { getCountries, getDistricts, getStates } from "@/lib/data/india-geo"
import { isValidGstin } from "@/lib/gst"
import { cn } from "@/lib/utils"

export type AddressFieldValues = {
  first_name?: string | null
  last_name?: string | null
  company?: string | null
  address_1?: string | null
  address_2?: string | null
  city?: string | null
  province?: string | null
  postal_code?: string | null
  country_code?: string | null
  phone?: string | null
  gstin?: string | null
}

/** Keep the currently-selected value visible even if it's not in the option
 * list (e.g. a legacy free-text state/district saved before this feature). */
function withSelected(
  options: ComboboxOption[],
  value: string
): ComboboxOption[] {
  if (value && !options.some((o) => o.value === value)) {
    return [{ value, label: value }, ...options]
  }
  return options
}

/**
 * Shared shipping/billing address fields (shadcn Field/FieldLabel/Input inside
 * the parent's `grid sm:grid-cols-2`). Field NAMES, the `prefix`/`values`/
 * `required` props, `defaultValue`-driven uncontrolled inputs, India pincode
 * `[0-9]{6}` and `type="tel"` on phone are preserved.
 *
 * Changed here:
 *  - The free-text Company field is gone; instead an optional GST Number field
 *    (shown when `showGst`) validates the GSTIN offline (format + checksum).
 *  - Country / State / District are now searchable comboboxes that cascade
 *    (state depends on country, district depends on state). They still submit
 *    through `${prefix}country_code` / `${prefix}province` / `${prefix}city`,
 *    so the parent parse functions are unchanged in shape. Because these are
 *    custom controls, the parent enforces "required" in its submit handler.
 */
export function AddressFields({
  prefix = "",
  values,
  required = true,
  showGst = false,
}: {
  prefix?: "billing_" | ""
  values?: AddressFieldValues
  required?: boolean
  showGst?: boolean
}) {
  const p = prefix

  const [country, setCountry] = useState(values?.country_code ?? "in")
  const [province, setProvince] = useState(values?.province ?? "")
  const [district, setDistrict] = useState(values?.city ?? "")
  const [gstin, setGstin] = useState(values?.gstin ?? "")

  const countryOptions = getCountries()
  const stateOptions = useMemo(
    () => withSelected(getStates(country), province),
    [country, province]
  )
  const districtOptions = useMemo(
    () => withSelected(getDistricts(country, province), district),
    [country, province, district]
  )

  function handleCountry(value: string) {
    setCountry(value)
    setProvince("")
    setDistrict("")
  }
  function handleProvince(value: string) {
    setProvince(value)
    setDistrict("")
  }

  const gstinTrimmed = gstin.trim()
  const gstinValid = gstinTrimmed.length > 0 && isValidGstin(gstinTrimmed)
  const gstinError = gstinTrimmed.length > 0 && !gstinValid

  return (
    <>
      <Field>
        <FieldLabel htmlFor={`${p}first_name`}>
          First Name {required && "*"}
        </FieldLabel>
        <Input
          id={`${p}first_name`}
          name={`${p}first_name`}
          required={required}
          defaultValue={values?.first_name ?? ""}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${p}last_name`}>
          Last Name {required && "*"}
        </FieldLabel>
        <Input
          id={`${p}last_name`}
          name={`${p}last_name`}
          required={required}
          defaultValue={values?.last_name ?? ""}
        />
      </Field>

      <Field className="sm:col-span-2">
        <FieldLabel htmlFor={`${p}country_code`}>
          Country {required && "*"}
        </FieldLabel>
        <Combobox
          id={`${p}country_code`}
          name={`${p}country_code`}
          options={countryOptions}
          value={country}
          onValueChange={handleCountry}
          placeholder="Select country"
          emptyText="No matching country"
        />
      </Field>

      <Field className="sm:col-span-2">
        <FieldLabel htmlFor={`${p}address_1`}>
          Address Line 1 {required && "*"}
        </FieldLabel>
        <Input
          id={`${p}address_1`}
          name={`${p}address_1`}
          required={required}
          defaultValue={values?.address_1 ?? ""}
        />
      </Field>
      <Field className="sm:col-span-2">
        <FieldLabel htmlFor={`${p}address_2`}>Address Line 2</FieldLabel>
        <Input
          id={`${p}address_2`}
          name={`${p}address_2`}
          defaultValue={values?.address_2 ?? ""}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={`${p}province`}>
          State {required && "*"}
        </FieldLabel>
        <Combobox
          id={`${p}province`}
          name={`${p}province`}
          options={stateOptions}
          value={province}
          onValueChange={handleProvince}
          disabled={!country}
          placeholder={country ? "Select state" : "Select a country first"}
          emptyText="No matching state"
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${p}city`}>
          District / City {required && "*"}
        </FieldLabel>
        <Combobox
          id={`${p}city`}
          name={`${p}city`}
          options={districtOptions}
          value={district}
          onValueChange={setDistrict}
          disabled={!province}
          placeholder={province ? "Select district" : "Select a state first"}
          emptyText="No matching district"
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={`${p}postal_code`}>
          Pincode {required && "*"}
        </FieldLabel>
        <Input
          id={`${p}postal_code`}
          name={`${p}postal_code`}
          required={required}
          pattern="[0-9]{6}"
          defaultValue={values?.postal_code ?? ""}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${p}phone`}>
          Phone {required && "*"}
        </FieldLabel>
        <Input
          id={`${p}phone`}
          name={`${p}phone`}
          type="tel"
          required={required}
          defaultValue={values?.phone ?? ""}
        />
      </Field>

      {showGst && (
        <Field className="sm:col-span-2" data-invalid={gstinError || undefined}>
          <FieldLabel htmlFor={`${p}gstin`}>
            GST Number{" "}
            <span className="font-normal text-athens-body">(optional)</span>
          </FieldLabel>
          <div className="relative">
            <Input
              id={`${p}gstin`}
              name={`${p}gstin`}
              value={gstin}
              onChange={(e) => setGstin(e.target.value.toUpperCase())}
              maxLength={15}
              autoComplete="off"
              aria-invalid={gstinError || undefined}
              placeholder="22AAAAA0000A1Z5"
              className={cn(
                gstinValid &&
                  "border-athens-success pr-9 focus-visible:border-athens-success focus-visible:ring-athens-success/20"
              )}
            />
            {gstinValid && (
              <CheckCircle2
                className="absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-athens-success"
                aria-hidden
              />
            )}
          </div>
          {gstinError ? (
            <FieldError>
              Enter a valid 15-character GSTIN (e.g. 22AAAAA0000A1Z5).
            </FieldError>
          ) : (
            <FieldDescription>
              {gstinValid
                ? "GSTIN format verified. Used to issue a GST invoice."
                : "Checked instantly for a valid format & checksum."}
            </FieldDescription>
          )}
        </Field>
      )}
    </>
  )
}
