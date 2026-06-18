import { HttpTypes } from "@medusajs/types"

export function isEmailVerified(
  customer: HttpTypes.StoreCustomer | null
): boolean {
  if (!customer) return false
  const value = customer.metadata?.email_verified
  return value === true || value === "true"
}
