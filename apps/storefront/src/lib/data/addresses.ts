"use server"

import { revalidatePath } from "next/cache"
import { storeFetch } from "../medusa"
import { authHeaders } from "./cookies"
import {
  type CartAddressInput,
  type CustomerAddress,
  customerAddressToCart,
} from "../address-utils"

const ADDRESS_FIELDS =
  "id,address_name,first_name,last_name,company,address_1,address_2,city,province,postal_code,country_code,phone,is_default_shipping,is_default_billing,metadata"

export async function listCustomerAddresses(): Promise<CustomerAddress[]> {
  try {
    const { addresses } = await storeFetch<{
      addresses: CustomerAddress[]
    }>("/store/customers/me/addresses", {
      query: { fields: ADDRESS_FIELDS, limit: 50 },
      headers: await authHeaders(),
      cache: "no-store",
    })
    return addresses ?? []
  } catch {
    return []
  }
}

export async function getCustomerAddress(
  id: string
): Promise<CustomerAddress | null> {
  try {
    const { address } = await storeFetch<{ address: CustomerAddress }>(
      `/store/customers/me/addresses/${id}`,
      {
        query: { fields: ADDRESS_FIELDS },
        headers: await authHeaders(),
        cache: "no-store",
      }
    )
    return address
  } catch {
    return null
  }
}

function parseAddressFromForm(
  formData: FormData,
  prefix: "" | "billing_"
): CartAddressInput {
  return {
    first_name: formData.get(`${prefix}first_name`) as string,
    last_name: formData.get(`${prefix}last_name`) as string,
    company: (formData.get(`${prefix}company`) as string) || undefined,
    address_1: formData.get(`${prefix}address_1`) as string,
    address_2: (formData.get(`${prefix}address_2`) as string) || undefined,
    city: formData.get(`${prefix}city`) as string,
    province: formData.get(`${prefix}province`) as string,
    postal_code: formData.get(`${prefix}postal_code`) as string,
    country_code: "in",
    phone: formData.get(`${prefix}phone`) as string,
  }
}

async function createCustomerAddress(
  data: CartAddressInput & {
    address_name?: string
    is_default_shipping?: boolean
    is_default_billing?: boolean
  }
) {
  await storeFetch("/store/customers/me/addresses", {
    method: "POST",
    headers: await authHeaders(),
    body: {
      address_name: data.address_name,
      first_name: data.first_name,
      last_name: data.last_name,
      company: data.company,
      address_1: data.address_1,
      address_2: data.address_2,
      city: data.city,
      province: data.province,
      postal_code: data.postal_code,
      country_code: data.country_code ?? "in",
      phone: data.phone,
      is_default_shipping: data.is_default_shipping ?? false,
      is_default_billing: data.is_default_billing ?? false,
    },
  })
}

export async function saveCustomerAddress(
  _prev: { error?: string; success?: boolean } | undefined,
  formData: FormData
) {
  const id = formData.get("id") as string | null
  const payload = {
    address_name: (formData.get("address_name") as string) || undefined,
    ...parseAddressFromForm(formData, ""),
    is_default_shipping: formData.get("is_default_shipping") === "on",
    is_default_billing: formData.get("is_default_billing") === "on",
  }

  try {
    if (id) {
      await storeFetch(`/store/customers/me/addresses/${id}`, {
        method: "POST",
        headers: await authHeaders(),
        body: payload,
      })
    } else {
      await createCustomerAddress(payload)
    }
    revalidatePath("/account/addresses")
    revalidatePath("/checkout")
    return { success: true }
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Could not save address",
    }
  }
}

export async function deleteCustomerAddressAction(
  _prev: { error?: string; success?: boolean } | undefined,
  formData: FormData
) {
  const id = formData.get("id") as string
  if (!id) return { error: "Missing address id" }
  try {
    await storeFetch(`/store/customers/me/addresses/${id}`, {
      method: "DELETE",
      headers: await authHeaders(),
    })
    revalidatePath("/account/addresses")
    revalidatePath("/checkout")
    return { success: true }
  } catch {
    return { error: "Could not delete address" }
  }
}

export async function resolveCheckoutAddresses(formData: FormData): Promise<{
  shipping: CartAddressInput
  billing: CartAddressInput
  saveShipping: boolean
  saveBilling: boolean
  usedSavedShipping: boolean
  usedSavedBilling: boolean
}> {
  const billingSame = formData.get("billing_same_as_shipping") === "on"
  const shippingId = formData.get("shipping_address_id") as string | null
  const billingId = formData.get("billing_address_id") as string | null
  const saveShipping = formData.get("save_shipping") === "on"
  const saveBilling = formData.get("save_billing") === "on"

  let shipping: CartAddressInput
  let usedSavedShipping = false
  if (shippingId) {
    const saved = await getCustomerAddress(shippingId)
    if (!saved) throw new Error("Selected shipping address not found")
    shipping = customerAddressToCart(saved)
    usedSavedShipping = true
  } else {
    shipping = parseAddressFromForm(formData, "")
  }

  let billing: CartAddressInput
  let usedSavedBilling = false
  if (billingSame) {
    billing = shipping
  } else if (billingId) {
    const saved = await getCustomerAddress(billingId)
    if (!saved) throw new Error("Selected billing address not found")
    billing = customerAddressToCart(saved)
    usedSavedBilling = true
  } else {
    billing = parseAddressFromForm(formData, "billing_")
  }

  return {
    shipping,
    billing,
    saveShipping,
    saveBilling,
    usedSavedShipping,
    usedSavedBilling,
  }
}

export async function persistCheckoutAddresses(
  resolved: Awaited<ReturnType<typeof resolveCheckoutAddresses>>,
  billingSame: boolean
) {
  const existing = await listCustomerAddresses()

  if (resolved.saveShipping && !resolved.usedSavedShipping) {
    await createCustomerAddress({
      ...resolved.shipping,
      address_name: "Shipping",
      is_default_shipping: !existing.some((a) => a.is_default_shipping),
      is_default_billing:
        billingSame && !existing.some((a) => a.is_default_billing),
    })
  }

  if (resolved.saveBilling && !resolved.usedSavedBilling && !billingSame) {
    await createCustomerAddress({
      ...resolved.billing,
      address_name: "Billing",
      is_default_billing: !existing.some((a) => a.is_default_billing),
    })
  }
}
