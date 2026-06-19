"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { sdk } from "@/lib/sdk"
import { queryKeys } from "@/lib/query-keys"

const CUSTOMER_FIELDS = "id,email,first_name,last_name,phone,metadata"

/**
 * The signed-in customer (CSR). The SDK auto-attaches the localStorage JWT; an
 * anonymous user just gets a 401 → null. Moderate staleTime (not 0) so the
 * header doesn't re-fetch /me on every focus. Auth mutations invalidate it.
 */
export function useCustomer() {
  const q = useQuery({
    queryKey: queryKeys.customer,
    queryFn: async () => {
      try {
        const { customer } = await sdk.store.customer.retrieve({
          fields: CUSTOMER_FIELDS,
        })
        return customer
      } catch {
        return null
      }
    },
    staleTime: 60_000,
    retry: false,
  })
  return { customer: q.data ?? null, isLoading: q.isLoading }
}

export function useAuthMutations() {
  const queryClient = useQueryClient()
  const syncCustomer = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.customer })

  const login = useMutation({
    mutationFn: (v: { email: string; password: string }) =>
      sdk.auth.login("customer", "emailpass", {
        email: v.email,
        password: v.password,
      }),
    onSuccess: syncCustomer,
  })

  const register = useMutation({
    mutationFn: async (v: {
      email: string
      password: string
      first_name: string
      last_name: string
      phone?: string
    }) => {
      await sdk.auth.register("customer", "emailpass", {
        email: v.email,
        password: v.password,
      })
      await sdk.store.customer.create({
        email: v.email,
        first_name: v.first_name,
        last_name: v.last_name,
        phone: v.phone,
        metadata: { email_verified: false },
      })
      // Exchange for a customer-session token, then send the verification email.
      await sdk.auth.login("customer", "emailpass", {
        email: v.email,
        password: v.password,
      })
      try {
        await sdk.client.fetch("/store/auth/send-verification", { method: "POST" })
      } catch {
        /* non-fatal */
      }
    },
    onSuccess: syncCustomer,
  })

  const logout = useMutation({
    mutationFn: () => sdk.auth.logout(),
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.customer, null)
      queryClient.invalidateQueries({ queryKey: queryKeys.customer })
      queryClient.invalidateQueries({ queryKey: ["cart"] })
    },
  })

  const resendVerification = useMutation({
    mutationFn: () =>
      sdk.client.fetch<{
        sent: boolean
        verify_url?: string
        already_verified?: boolean
      }>("/store/auth/send-verification", { method: "POST" }),
  })

  return { login, register, logout, resendVerification }
}
