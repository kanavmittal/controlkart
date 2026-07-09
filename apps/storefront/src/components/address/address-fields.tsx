import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export type AddressFieldValues = {
  first_name?: string | null
  last_name?: string | null
  company?: string | null
  address_1?: string | null
  address_2?: string | null
  city?: string | null
  province?: string | null
  postal_code?: string | null
  phone?: string | null
}

/**
 * Athens restyle of the shared shipping/billing address fields (shadcn
 * Field/FieldLabel/Input, 2-col grid via the parent's `grid sm:grid-cols-2`
 * — unchanged here). Field NAMES, the `prefix`/`values`/`required` props,
 * `defaultValue`-driven uncontrolled inputs, `required`/`pattern` validation
 * (India pincode `[0-9]{6}`), and `type="tel"` on phone are all preserved
 * verbatim from the pre-restyle version — only the markup changed. No
 * country field is rendered (country_code stays hardcoded "in" by callers);
 * "State" stays a free-text Input rather than a Select so validation
 * behavior doesn't drift from a fixed options list.
 */
export function AddressFields({
  prefix = "",
  values,
  required = true,
}: {
  prefix?: "billing_" | ""
  values?: AddressFieldValues
  required?: boolean
}) {
  const p = prefix
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
        <FieldLabel htmlFor={`${p}company`}>Company</FieldLabel>
        <Input
          id={`${p}company`}
          name={`${p}company`}
          defaultValue={values?.company ?? ""}
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
        <FieldLabel htmlFor={`${p}city`}>City {required && "*"}</FieldLabel>
        <Input
          id={`${p}city`}
          name={`${p}city`}
          required={required}
          defaultValue={values?.city ?? ""}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${p}province`}>
          State {required && "*"}
        </FieldLabel>
        <Input
          id={`${p}province`}
          name={`${p}province`}
          required={required}
          defaultValue={values?.province ?? ""}
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
    </>
  )
}
