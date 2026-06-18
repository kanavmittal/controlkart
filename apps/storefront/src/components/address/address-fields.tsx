export const inputClass =
  "w-full border border-[var(--color-line)] px-3 py-2 text-sm outline-none focus:border-[var(--color-line-strong)]"

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
      <label className="grid gap-1 text-sm font-medium">
        First Name {required && "*"}
        <input
          name={`${p}first_name`}
          required={required}
          defaultValue={values?.first_name ?? ""}
          className={inputClass}
        />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Last Name {required && "*"}
        <input
          name={`${p}last_name`}
          required={required}
          defaultValue={values?.last_name ?? ""}
          className={inputClass}
        />
      </label>
      <label className="grid gap-1 text-sm font-medium sm:col-span-2">
        Company
        <input
          name={`${p}company`}
          defaultValue={values?.company ?? ""}
          className={inputClass}
        />
      </label>
      <label className="grid gap-1 text-sm font-medium sm:col-span-2">
        Address Line 1 {required && "*"}
        <input
          name={`${p}address_1`}
          required={required}
          defaultValue={values?.address_1 ?? ""}
          className={inputClass}
        />
      </label>
      <label className="grid gap-1 text-sm font-medium sm:col-span-2">
        Address Line 2
        <input
          name={`${p}address_2`}
          defaultValue={values?.address_2 ?? ""}
          className={inputClass}
        />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        City {required && "*"}
        <input
          name={`${p}city`}
          required={required}
          defaultValue={values?.city ?? ""}
          className={inputClass}
        />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        State {required && "*"}
        <input
          name={`${p}province`}
          required={required}
          defaultValue={values?.province ?? ""}
          className={inputClass}
        />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Pincode {required && "*"}
        <input
          name={`${p}postal_code`}
          required={required}
          pattern="[0-9]{6}"
          defaultValue={values?.postal_code ?? ""}
          className={inputClass}
        />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Phone {required && "*"}
        <input
          name={`${p}phone`}
          type="tel"
          required={required}
          defaultValue={values?.phone ?? ""}
          className={inputClass}
        />
      </label>
    </>
  )
}
