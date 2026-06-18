import { HttpTypes } from "@medusajs/types"

export type CustomerAddress = HttpTypes.StoreCustomerAddress

export type CartAddressInput = {
  first_name: string
  last_name: string
  company?: string
  address_1: string
  address_2?: string
  city: string
  province: string
  postal_code: string
  country_code: string
  phone: string
}

export function getDefaultShippingAddress(
  addresses: CustomerAddress[]
): CustomerAddress | undefined {
  return (
    addresses.find((a) => a.is_default_shipping) ??
    addresses.find((a) => a.is_default_billing) ??
    addresses[0]
  )
}

export function customerAddressToCart(
  address: CustomerAddress
): CartAddressInput {
  return {
    first_name: address.first_name ?? "",
    last_name: address.last_name ?? "",
    company: address.company ?? undefined,
    address_1: address.address_1 ?? "",
    address_2: address.address_2 ?? undefined,
    city: address.city ?? "",
    province: address.province ?? "",
    postal_code: address.postal_code ?? "",
    country_code: address.country_code ?? "in",
    phone: address.phone ?? "",
  }
}

export function formatAddressLabel(address: CustomerAddress): string {
  const name = [address.first_name, address.last_name].filter(Boolean).join(" ")
  const line = [address.address_1, address.city, address.postal_code]
    .filter(Boolean)
    .join(", ")
  return address.address_name
    ? `${address.address_name} — ${line}`
    : name
      ? `${name} — ${line}`
      : line
}
