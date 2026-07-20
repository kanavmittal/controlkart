"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { HttpTypes } from "@medusajs/types"
import { sdk } from "@/lib/sdk"
import { queryKeys } from "@/lib/query-keys"

const ADDRESS_FIELDS =
  "id,address_name,first_name,last_name,company,address_1,address_2,city,province,postal_code,country_code,phone,is_default_shipping,is_default_billing,metadata"

export type AddressBody = {
  address_name?: string
  first_name?: string
  last_name?: string
  company?: string
  address_1?: string
  address_2?: string
  city?: string
  province?: string
  postal_code?: string
  country_code?: string
  phone?: string
  metadata?: Record<string, unknown>
  is_default_shipping?: boolean
  is_default_billing?: boolean
}

export function useAddresses() {
  const queryClient = useQueryClient()
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.customerAddresses })

  const q = useQuery({
    queryKey: queryKeys.customerAddresses,
    queryFn: async () => {
      try {
        const { addresses } = await sdk.store.customer.listAddress({
          limit: 50,
          fields: ADDRESS_FIELDS,
        })
        return addresses
      } catch {
        return [] as HttpTypes.StoreCustomerAddress[]
      }
    },
    staleTime: 30_000,
    retry: false,
  })

  const save = useMutation({
    mutationFn: (v: { id?: string; body: AddressBody }) =>
      v.id
        ? sdk.store.customer.updateAddress(v.id, v.body)
        : sdk.store.customer.createAddress(v.body),
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: (id: string) => sdk.store.customer.deleteAddress(id),
    onSuccess: invalidate,
  })

  return { addresses: q.data ?? [], isLoading: q.isLoading, save, remove }
}
