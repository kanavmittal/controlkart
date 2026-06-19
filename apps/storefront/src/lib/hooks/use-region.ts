"use client"

import { useQuery } from "@tanstack/react-query"
import { sdk } from "@/lib/sdk"
import { queryKeys } from "@/lib/query-keys"

/**
 * Client mirror of the server `getRegionId()` (lib/data/products.ts): picks the
 * India region (iso_2 "in"), else the first. MUST stay in sync with the server
 * selector so client-fetched prices match the server-rendered catalog's
 * currency/tax. Regions are effectively static → cached for the session.
 */
export function useRegion() {
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.region,
    queryFn: async () => {
      const { regions } = await sdk.store.region.list({
        fields: "id,name,*countries",
      })
      return (
        regions.find((r) => r.countries?.some((c) => c.iso_2 === "in"))?.id ??
        regions[0]?.id ??
        null
      )
    },
    staleTime: Infinity,
    gcTime: Infinity,
  })

  return { regionId: data ?? undefined, isLoading, isError }
}
